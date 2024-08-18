(pkg => {
    let gameMap,
        headerOverlay,
        footerOverlay,
        leftOverlay,
        rightOverlay,
        rightPanel,
        
        mapInfo,
        playingAsTxt,
        myLocInfo,
        
        alterCellBtn,
        alterCellCompositionSelector,
        teleportBtn,
        teleportLocField,
        
        character,
        curLocId;
    
    const I18N = BABEL.get,
        JSClass = JS.Class,
        
        M = myt,
        {
            View, Text, PaddedText, InputSelect, SpacedLayout, ResizeLayout, 
            global:{keys:GlobalKeys}
        } = M,
        
        {
            character:{
                FIELD_NAME, 
                FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_FREE, FIELD_LOCK_REACT
            },
            greek:{
                ATTR_DIRECTION,
                TYPE_EXIT_WORLD, TYPE_ALTER_CELL, TYPE_CHANGE_FACING, TYPE_VOCALIZE
            },
            cell:{FIELD_COMPOSITION},
            FACINGS,
            composition,
            util:{locIdToArr}
        } = common,
        
        {
            model,
            TextBtn, TranslucentSquareBtn, componentUtil, FormInputText,
            theme:{padding, spacing, cornerRadius, colorBgF},
            cfg:{cellSize, entitySizeM}
        } = pkg,
        
        overlayMargin = 4,
        overlaySize = cellSize - overlayMargin,
        
        getMapInfo = cell => {
            const locArr = locIdToArr(cell.locId),
                mapId = locArr[0],
                mapDatum = model.getMapDatum(mapId);
            return (mapDatum ? mapDatum.name : 'Pocket Dimension ' + mapId) + ' - Level ' + locArr[3];
        },
        
        getLocInfo = cell => {
            const locArr = locIdToArr(cell.locId),
                mapDatum = model.getMapDatum(locArr[0]);
            return composition[cell.hasBeenSeen ? cell[FIELD_COMPOSITION] : 'unk'].name + ' / x:' + locArr[1] + ' / y:' + locArr[2];
        },
        
        getEntityInfo = entity => {
            let extraInfo = '';
            if (entity.isSpirit()) {
                extraInfo = ' : Spirit';
            } else if (entity.isAstralProjected()) {
                extraInfo = ' : Astrally Projected';
            } else if (entity.isZombie()) {
                extraInfo = ' : Zombie';
            }
            if (entity.inWorld) {
                if (entity === character) {
                    extraInfo += ' : My Character';
                } else {
                    extraInfo += ' : Active Player Character';
                }
            }
            return entity.name + extraInfo;
        },
        
        doMoveCharacter = direction => {
            if (!character.doMove(direction)) {
                gameMap.animateEntity(character.getId());
                // FIXME: msg into chat log? "You can't move right now."
            }
        },
        
        notifyCanNotAct = entity => {
            gameMap.animateEntity(entity.getId());
            // FIXME: msg into chat log? "You can't act right now."
        },
        
        doArrowKey = (domEvent, direction) => {
            domEvent.preventDefault();
            doMoveCharacter(direction);
        },
        
        doFacingKey = (domEvent, compassDirection) => {
            domEvent.preventDefault();
            if (!character.doFree(TYPE_CHANGE_FACING, {[ATTR_DIRECTION]:compassDirection})) {
                gameMap.animateEntity(character.getId());
                // FIXME: msg into chat log? "You can't face a different direction right now."
            }
        },
        
        buildEntityHighlightView = parent => {
            let infoContainer,
                infoTxt;
            const borderWidth = 1,
                size = cellSize - 4*borderWidth,
                hv = new View(parent, {
                    height:cellSize, pointerEvents:'none', visible:false,
                    bgColor:'#333', opacity:0.8, boxShadow:[0,0,8,'#000'], 
                    zIndex:11
                }, [{
                    update: function(isOver, entity, entityView) {
                        this.setVisible(isOver);
                        if (isOver) {
                            this.setRoundedCorners(entityView.width / 2);
                            infoTxt.setText(getEntityInfo(entity));
                            this.setWidth(infoTxt.x + infoTxt.width + padding);
                            this.setHeight(infoTxt.y + infoTxt.height + spacing);
                            
                            this.setX(entityView.x);
                            this.setY(entityView.y - this.height - cellSize / 2); // FIXME: above/below
                        }
                    }
                }]);
            infoTxt = new Text(hv, {x:padding, y:spacing, textColor:colorBgF});
            return hv;
        },
        
        buildCellHighlightView = parent => {
            let infoContainer,
                infoTxt;
            const borderWidth = 1,
                bw2x = 2*borderWidth,
                bw4x = 4*borderWidth,
                size = cellSize,
                color = colorBgF,
                shadowColor = '#000',
                hv = new View(parent, {
                    height:cellSize + bw4x, pointerEvents:'none', visible:false,
                    opacity:0.8, boxShadow:[0,0,8,shadowColor], zIndex:10
                }, [{
                    update: function(isOver, cell, cellView) {
                        this.setVisible(isOver);
                        if (isOver) {
                            this.setX(cellView.x - bw2x);
                            this.setY(cellView.y - bw2x);
                            infoTxt.setText(getLocInfo(cell));
                            this.setWidth(infoTxt.x + infoTxt.width + padding);
                            infoContainer.setWidth(this.width - infoContainer.x);
                        }
                    }
                }]);
            new View(hv, {
                x:borderWidth, y:borderWidth, width:size, height:size, 
                outline:[borderWidth, 'solid', color], 
                border:[borderWidth, 'solid', shadowColor]
            });
            infoContainer = new View(hv, {x:cellSize + bw4x, height:cellSize + bw4x, bgColor:color});
            infoTxt = new Text(hv, {x:cellSize + bw4x + spacing, valign:'middle', textColor:'#000'});
            return hv;
        },
        
        updateWidth = () => {
            const w = gamePanel.width,
                rightPanelX = 760,
                overlayWidth = rightPanelX - 2*overlayMargin;
            gameMap.setWidth(w);
            
            rightPanel.setX(rightPanelX);
            rightPanel.setWidth(w - rightPanelX);
            
            leftOverlay.setX(overlayMargin);
            rightOverlay.setX(rightPanelX - rightOverlay.width - overlayMargin);
            
            headerOverlay.setWidth(overlayWidth);
            footerOverlay.setWidth(overlayWidth);
        },
        
        updateHeight = () => {
            const h = gamePanel.height,
                overlayHeight = h - 2*(2*overlayMargin + overlaySize);
            gameMap.setHeight(h);
            rightPanel.setHeight(h);
            
            headerOverlay.setY(overlayMargin);
            footerOverlay.setY(h - footerOverlay.height - overlayMargin);
            
            leftOverlay.setHeight(overlayHeight);
            rightOverlay.setHeight(overlayHeight);
        };
    
    pkg.GamePanel = new JSClass('GamePanel', pkg.BaseStackablePanel, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gamePanel = pkg.gamePanel = this;
            gamePanel.callSuper(parent, attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: v => {
            gamePanel.callSuper(v);
            
            if (gamePanel.visible) {
                pkg.websocketUtil.connectToWebsocket();
                componentUtil.reparentWorldClockView(headerOverlay);
                headerOverlay.getFirstLayout().update();
                
                componentUtil.reparentSocketStatusIndicator(footerOverlay);
                footerOverlay.getFirstLayout().update();
                
                character = model.getCharacterInPlay();
                gameMap.setCharacter(character);
                updateWidth();
                updateHeight();
                
                const hasCreatorPerm = character.hasPermission('creator');
                for (const view of [alterCellBtn, alterCellCompositionSelector, teleportBtn, teleportLocField]) {
                    view.setVisible(hasCreatorPerm);
                }
                
                playingAsTxt.setText(pkg.FA_CHARACTER + ' ' + character[FIELD_NAME]);
                
                gamePanel.attachToDom(GlobalKeys, '_keyDown', 'keydown', true);
            } else {
                gamePanel.detachFromDom(GlobalKeys, '_keyDown', 'keydown', true);
                if (gameMap) {
                    gameMap.setCharacter();
                    myLocInfo.setText();
                    mapInfo.setText();
                }
            }
        },
        
        setWidth: v => {
            gamePanel.callSuper(v);
            if (gamePanel.inited) updateWidth();
        },
        
        setHeight: v => {
            gamePanel.callSuper(v);
            if (gamePanel.inited) updateHeight();
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        /** @private */
        _keyDown: event => {
            const domEvent = event.value,
                srcView = M.DomObserver.getSourceViewFromEvent(domEvent);
            if (
                // Don't handle keys from native form elements.
                !srcView || !(srcView.isA(M.BaseInputText) || srcView.isA(InputSelect))
            ) {
                switch (M.KeyObservable.getCodeFromEvent(event)) {
                    case GlobalKeys.CODE_ARROW_LEFT:  return doArrowKey(domEvent, FACINGS.WEST);
                    case GlobalKeys.CODE_ARROW_UP:    return doArrowKey(domEvent, FACINGS.NORTH);
                    case GlobalKeys.CODE_ARROW_RIGHT: return doArrowKey(domEvent, FACINGS.EAST);
                    case GlobalKeys.CODE_ARROW_DOWN:  return doArrowKey(domEvent, FACINGS.SOUTH);
                    
                    case GlobalKeys.CODE_W: return doFacingKey(domEvent, FACINGS.NORTH);
                    case GlobalKeys.CODE_A: return doFacingKey(domEvent, FACINGS.WEST);
                    case GlobalKeys.CODE_S: return doFacingKey(domEvent, FACINGS.SOUTH);
                    case GlobalKeys.CODE_D: return doFacingKey(domEvent, FACINGS.EAST);
                }
            }
            return true;
        },
        
        buildUI: () => {
            gameMap = new pkg.GameMap(gamePanel, {}, [{
                doCharacterCell: (character, cell, cellView) => {
                    if (curLocId !== cell.locId) {
                        curLocId = cell.locId;
                        cellHV.setVisible(false);
                    }
                    mapInfo.setText(pkg.FA_LOCATION + ' ' + getMapInfo(cell));
                    myLocInfo.setText('My Location: ' + getLocInfo(cell));
                }
            }]);
            rightPanel = new View(gamePanel, {bgColor:'#0003'});
            
            gamePanel.buildOverlays();
            
            // Highlight Views
            const cellHV = buildCellHighlightView(gamePanel),
                entityHV = buildEntityHighlightView(gamePanel);
            gameMap.doMouseOverCell = cellHV.update.bind(cellHV);
            gameMap.doMouseOverEntity = entityHV.update.bind(entityHV);
            
            // Right Panel
            myLocInfo = new Text(rightPanel, {textColor:colorBgF, layoutHint:'break'});
            
            // Vocalize
            const vocalizationVolumeSelector = new InputSelect(rightPanel, {
                    height:28, layoutHint:'break', options:[
                        {label:'Whisper', value:'whisper'},
                        {label:'Speak', value:'speak'},
                        {label:'Yell', value:'yell'},
                    ]
                }),
                messageField = new FormInputText(rightPanel, {
                    width:125, maxLength:200, acceleratorScope:'root'
                },[{doAccept: () => {sendBtn.doActivated();}}]),
                sendBtn = new TextBtn(rightPanel, {text:'Send'}, [{
                    doActivated: () => {
                        const message = messageField.value;
                        if (message) {
                            if (!character.doFree(TYPE_VOCALIZE, {volume:vocalizationVolumeSelector.value, message:message})) {
                                notifyCanNotAct(character);
                            }
                        }
                    }
                }]);
            vocalizationVolumeSelector.selectValue('speak');
            
            // Alter Cell
            alterCellBtn = new TextBtn(rightPanel, {text:'Alter Cell', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    if (!character.doFree(TYPE_ALTER_CELL, {direction:'here', prop:'c', value:alterCellCompositionSelector.value})) {
                        notifyCanNotAct(character);
                    }
                }
            }]);
            const options = [];
            for (const key in composition) {
                const entry = composition[key];
                options.push({label:entry.name, value:key});
            }
            alterCellCompositionSelector = new InputSelect(rightPanel, {
                visible:false, height:28, options:options
            });
            
            // Teleport
            teleportBtn = new TextBtn(rightPanel, {text:'Teleport', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    const value = teleportLocField.value;
                    if (value && value.length >= 7) doMoveCharacter(value);
                }
            }]);
            teleportLocField = new FormInputText(rightPanel, {
                width:100, visible:false, maxLength:24, allowedChars:'-,0123456789',
                acceleratorScope:'root'
            },[{doAccept:teleportBtn.doActivated}]);
            
            new M.WrappingLayout(rightPanel, {
                inset:padding, spacing:spacing, outset:padding, 
                lineInset:padding, lineSpacing:spacing, lineOutset:padding
            });
        },
        
        buildOverlays: () => {
            const Overlay = new JSClass('Overlay', View, {
                    initNode: function(parent, attrs) {
                        attrs.roundedCorners = cornerRadius + 2;
                        attrs.textColor = colorBgF;
                        attrs.pointerEvents = 'none';
                        this.callSuper();
                    }
                }),
                
                HorizontalOverlay = new JSClass('HorizontalOverlay', Overlay, {
                    initNode: function(parent, attrs) {
                        const insets = attrs.insets ??= 12;
                        delete attrs.insets;
                        
                        attrs.x = overlayMargin;
                        attrs.height ??= overlaySize;
                        
                        this.callSuper();
                        this.getIDS().background = 'linear-gradient(to left, #0003, #0000, #0000, #0003)';
                        new ResizeLayout(this, {inset:insets, spacing:spacing, outset:insets});
                    }
                }),
                
                VerticalOverlay = new JSClass('VerticalOverlay', Overlay, {
                    initNode: function(parent, attrs) {
                        const insets = attrs.insets ??= 8;
                        delete attrs.insets;
                        
                        attrs.y = 2*overlayMargin + overlaySize;
                        attrs.width ??= overlaySize;
                        
                        this.callSuper();
                        this.getIDS().background = 'linear-gradient(to bottom, #0003, #0000, #0000, #0003)';
                        new ResizeLayout(this, {axis:'y', inset:insets, spacing:spacing, outset:insets});
                    }
                });
            
            // Header Overlay
            headerOverlay = new HorizontalOverlay(gamePanel);
            mapInfo = new Text(headerOverlay, {valign:'middle'});
            new View(headerOverlay, {layoutHint:1});
            playingAsTxt = new Text(headerOverlay, {valign:'middle'});
            new View(headerOverlay, {layoutHint:1});
            
            // Footer Overlay
            footerOverlay = new HorizontalOverlay(gamePanel, {insets:4});
            new TranslucentSquareBtn(footerOverlay, {
                valign:'middle', text:pkg.FA_CLOSE, tooltip:'Leave Ouroboros.'
            }, [{
                doActivated:() => {
                    const confirmFunc = () => {
                        pkg.app.lockUI('Leaving Ouroboros...', true);
                        pkg.websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.getId()});
                    };
                    if (GlobalKeys.isShiftKeyDown()) {
                        confirmFunc();
                    } else {
                        orb.showConfirmDialog('Yes, I meant to click the exit button and leave the game world.', 'Exit Ouroboros?', 'Exit', confirmFunc);
                    }
                }
            }]);
            new View(footerOverlay, {layoutHint:1});
            
            // Left Overlay
            leftOverlay = new VerticalOverlay(gamePanel, {insets:4});
            
            const makeCooldown = (propTargetName, readyIcon) => {
                new pkg.CharacterCooldownRadialGuage(leftOverlay, {
                    x:1, propTargetName:propTargetName, cooldownName:I18N('cooldownName-' + propTargetName),
                    pointerEvents:'auto', readyIcon:readyIcon
                });
            };
            makeCooldown(FIELD_LOCK_MOVE, pkg.FA_MOVE);
            makeCooldown(FIELD_LOCK_ACTION, pkg.FA_ACTION);
            makeCooldown(FIELD_LOCK_REACT, pkg.FA_REACT);
            makeCooldown(FIELD_LOCK_FREE, pkg.FA_FREE_ACTION);
            
            
            
            // Right Overlay
            rightOverlay = new VerticalOverlay(gamePanel);
        }
    });
})(orb);

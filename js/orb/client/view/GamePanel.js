(pkg => {
    let gameMap,
        headerOverlay,
        footerOverlay,
        leftOverlay,
        rightOverlay,
        leftPanel,
        rightPanel,
        characterTab,
        
        msgLog,
        
        mapInfo,
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
            View, Text, PaddedText, InputSelect, SizeToParent,
            SpacedLayout, ResizeLayout, WrappingLayout,
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
            composition:{compositions},
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
        tabSliderBtnHeight = cellSize,
        
        getMapInfo = cell => {
            const locArr = locIdToArr(cell.locId),
                mapId = locArr[0],
                mapDatum = model.getMapDatum(mapId);
            return (mapDatum ? mapDatum.name : 'Pocket Dimension ' + mapId) + ' - Level ' + locArr[3];
        },
        
        getLocInfo = cell => {
            const locArr = locIdToArr(cell.locId),
                mapDatum = model.getMapDatum(locArr[0]);
            return compositions[cell.hasBeenSeen() ? cell[FIELD_COMPOSITION] : 'unk'].name + ' / x:' + locArr[1] + ' / y:' + locArr[2];
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
                gamePanel.appendToChatLog('<i>You can\'t move right now.</i>');
            }
        },
        
        notifyCanNotAct = entity => {
            gameMap.animateEntity(entity.getId());
            gamePanel.appendToChatLog('<i>You can\'t act right now.</i>');
        },
        
        doArrowKey = (domEvent, direction) => {
            domEvent.preventDefault();
            doMoveCharacter(direction);
        },
        
        doFacingKey = (domEvent, compassDirection) => {
            domEvent.preventDefault();
            if (compassDirection === character.getFacing()) {
                gamePanel.appendToChatLog('<i>You\'re already facing that direction.</i>');
            } else if (!character.doFree(TYPE_CHANGE_FACING, {[ATTR_DIRECTION]:compassDirection})) {
                gameMap.animateEntity(character.getId());
                gamePanel.appendToChatLog('<i>You can\'t face a different direction right now.</i>');
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
                            
                            this.setX(gameMap.x + entityView.x - (this.width - entityView.width) / 2);
                            this.setY(entityView.y + entityView.height + cellSize / 2); // FIXME: above/below
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
                            this.setX(gameMap.x + cellView.x - bw2x);
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
                mapWidth = cellSize * 19,
                overlayWidth = mapWidth - 2*overlayMargin,
                leftWidth = (w - mapWidth) / 2,
                rightWidth = leftWidth,
                mapX = leftWidth,
                overlayX = mapX + overlayMargin,
                rightPanelX = mapX + mapWidth;
            
            leftPanel.setWidth(leftWidth);
            
            gameMap.setX(leftWidth);
            gameMap.setWidth(mapWidth);
            
            leftOverlay.setX(leftWidth + overlayMargin);
            rightOverlay.setX(rightPanelX - rightOverlay.width - overlayMargin);
            
            headerOverlay.setX(overlayX);
            headerOverlay.setWidth(overlayWidth);
            footerOverlay.setX(overlayX);
            footerOverlay.setWidth(overlayWidth);
            
            rightPanel.setX(rightPanelX);
            rightPanel.setWidth(rightWidth);
        },
        
        updateHeight = () => {
            const h = gamePanel.height,
                overlayHeight = h - 2*(2*overlayMargin + overlaySize);
            leftPanel.setHeight(h);
            gameMap.setHeight(h);
            rightPanel.setHeight(h);
            
            headerOverlay.setY(overlayMargin);
            footerOverlay.setY(h - footerOverlay.height - overlayMargin);
            
            leftOverlay.setHeight(overlayHeight);
            rightOverlay.setHeight(overlayHeight);
        },
        
        LocalTabSliderContainer = new JSClass('LocalTabSliderContainer', View, {
            include: [M.TabSliderContainer],
            
            initNode: function(parent, attrs) {
                attrs.maxSelected ??= -1;
                attrs.spacing ??= 0;
                attrs.bgColor ??= '#000';
                
                this.callSuper(parent, attrs);
            },
            
            updateLayout: function(ignoredEvent, temporaryDuration) {
                const tabSliders = this.getTabSliders(),
                    openCount = this.selectedCount,
                    closedCount = tabSliders.length - openCount,
                    height = (this.height - closedCount * tabSliderBtnHeight) / openCount;
                for (const tabSlider of tabSliders) {
                    if (tabSlider.selected) {
                        tabSlider.expand(height);
                    } else {
                        tabSlider.collapse();
                    }
                }
            },
            
            deselect: function(item) {
                if (this.selectedCount > 1) this.callSuper(item);
            }
        }),
        
        LocalTabSlider = new JSClass('LocalTabSlider', M.TabSlider, {
            initNode: function(parent, attrs) {
                attrs.pointerEvents = 'auto';
                
                attrs.buttonHeight ??= tabSliderBtnHeight;
                attrs.fillColorSelected ??= '#333';
                attrs.fillColorActive ??= '#111';
                attrs.fillColorHover ??= '#333';
                attrs.fillColorReady ??= '#222';
                attrs.textColor ??= colorBgF;
                
                this.callSuper(parent, attrs);
                
                this.labelView = new Text(this.button, {
                    x:padding, ignorePlacement:true,
                    text:this.text, valign:'middle'
                });
            },
            
            // Accessors ///////////////////////////////////////////////////////
            setText: function(v) {
                if (this.text !== v) {
                    this.text = v;
                    this.labelView?.setText(v);
                }
            }
        });
    
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
                
                characterTab.setText(pkg.FA_CHARACTER + ' ' + character[FIELD_NAME]);
                
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
        appendToChatLog: msg => {if (msg) msgLog.appendMsg(msg);},
        
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
            gamePanel.buildLeftPanel();
            gameMap = new pkg.GameMap(gamePanel, {}, [{
                doCharacterCell: (character, cell, cellView) => {
                    if (curLocId !== cell.locId) {
                        curLocId = cell.locId;
                        cellHV.setVisible(false);
                    }
                    mapInfo.setText(pkg.FA_GLOBE + ' ' + getMapInfo(cell));
                    myLocInfo.setText('My Location: ' + getLocInfo(cell));
                }
            }]);
            gamePanel.buildOverlays();
            gamePanel.buildRightPanel();
            
            // Highlight Views
            const cellHV = buildCellHighlightView(gamePanel),
                entityHV = buildEntityHighlightView(gamePanel);
            gameMap.doMouseOverCell = cellHV.update.bind(cellHV);
            gameMap.doMouseOverEntity = entityHV.update.bind(entityHV);
            
        },
        
        buildLeftPanel: () => {
            leftPanel = new LocalTabSliderContainer(gamePanel, {persistenceId:'orb.GamePanel.leftTabIds'});
            
            // Location Tab
            const locationTab = new LocalTabSlider(leftPanel, {
                tabId:'location', text:pkg.FA_LOCATION + ' Location'
            });
            
            myLocInfo = new Text(locationTab, {height:20, textColor:colorBgF});
            
            new WrappingLayout(locationTab, {
                inset:padding, spacing:spacing, outset:padding, 
                lineInset:padding, lineSpacing:spacing, lineOutset:padding
            });
            
            
            // Chat Tab
            const chatTab = new LocalTabSlider(leftPanel, {
                tabId:'chat', text:pkg.FA_FREE_ACTION + ' Messages and Events',
                noWrapperContainer:true, bgColor:'#333'
            });
            
            msgLog = new PaddedText(chatTab, {
                percentOfParentWidth:100, layoutHint:1, padding:spacing, text:'',
                whiteSpace:'normal', overflow:'autoy', userUnselectable:false
            }, [SizeToParent, {
                appendMsg: function(msg) {
                    this.setText(this.text + msg + '<br>');
                    const ide = this.getIDE();
                    ide.scrollTo({top:ide.scrollHeight, behavior:'smooth'});
                }
            }]);
            
            const row = new View(chatTab, {percentOfParentWidth:100, height:28}, [SizeToParent]);
            const messageField = new FormInputText(row, {
                    maxLength:80, acceleratorScope:'root', layoutHint:1
                },[{doAccept: () => {sendBtn.doActivated();}}]),
                
                sendBtn = new TextBtn(row, {width:55, text:'Send'}, [{
                    doActivated: () => {
                        const rawMsg = messageField.value;
                        if (rawMsg) {
                            // Parse "slash" commands
                            let command,
                                msg = rawMsg.trim();
                            if (msg.startsWith('/')) {
                                const parts = msg.slice(1).split(' ', 2);
                                command = parts[0];
                                msg = parts[1] ? parts[1] : '';
                            }
                            
                            let volume;
                            switch (command) {
                                case 'w': case 'whisper':
                                    volume = 1<<2;
                                    break;
                                case 'y': case 'yell':
                                    volume = 1<<9;
                                    break;
                                case 's': case 'speak':
                                    volume = 1<<6;
                                    break;
                                default:
                                    volume = 1<<6;
                                    msg = rawMsg;
                            }
                            
                            if (character.doFree(TYPE_VOCALIZE, {volume:volume, message:msg})) {
                                messageField.setValue('');
                            } else {
                                notifyCanNotAct(character);
                            }
                        }
                    }
                }]);
            new ResizeLayout(row, {inset:spacing, spacing:spacing, outset:spacing});
            
            new ResizeLayout(chatTab, {axis:'y', spacing:spacing, outset:spacing});
            
            leftPanel.restoreState(['location', 'chat']);
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
        },
        
        buildRightPanel: () => {
            rightPanel = new LocalTabSliderContainer(gamePanel, {persistenceId:'orb.GamePanel.rightTabIds'});
            
            characterTab = new LocalTabSlider(rightPanel, {
                tabId:'character', text:pkg.FA_CHARACTER + ' Character'
            });
            
            const inventoryTab = new LocalTabSlider(rightPanel, {
                tabId:'inventory', text:pkg.FA_INVENTORY + ' Inventory'
            });
            
            // Character Tab
            // Alter Cell
            alterCellBtn = new TextBtn(characterTab, {text:'Alter Cell', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    if (!character.doFree(TYPE_ALTER_CELL, {direction:'here', prop:'c', value:alterCellCompositionSelector.value})) {
                        notifyCanNotAct(character);
                    }
                }
            }]);
            const options = [];
            for (const key in compositions) {
                const entry = compositions[key];
                options.push({label:entry.name, value:key});
            }
            alterCellCompositionSelector = new InputSelect(characterTab, {
                visible:false, height:28, options:options
            });
            
            // Teleport
            teleportBtn = new TextBtn(characterTab, {text:'Teleport', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    const value = teleportLocField.value;
                    if (value && value.length >= 7) doMoveCharacter(value);
                }
            }]);
            teleportLocField = new FormInputText(characterTab, {
                width:100, visible:false, maxLength:24, allowedChars:'-,0123456789',
                acceleratorScope:'root'
            },[{doAccept:teleportBtn.doActivated}]);
            
            new M.WrappingLayout(characterTab, {
                inset:padding, spacing:spacing, outset:padding, 
                lineInset:padding, lineSpacing:spacing, lineOutset:padding
            });
            
            rightPanel.restoreState(['character','inventory']);
        }
    });
})(orb);

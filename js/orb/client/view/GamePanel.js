(pkg => {
    let titleHeader,
        contentView,
        
        mapInfo,
        myLocInfo,
        gameMap,
        
        rightPanel,
        alterCellBtn,
        alterCellCompositionSelector,
        teleportBtn,
        teleportLocField,
        
        websocket,
        character,
        curLocId;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, PaddedText, SpacedLayout, ResizeLayout, SizeToParent, 
            InputSelect,
            global:{keys:GlobalKeys}
        } = M,
        
        {
            character:{
                FIELD_NAME, 
                FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_FREE, FIELD_LOCK_REACT
            },
            greek:{
                ATTR_DIRECTION,
                TYPE_EXIT_WORLD, TYPE_ALTER_CELL, TYPE_CHANGE_FACING
            },
            cell:{FIELD_COMPOSITION},
            FACINGS,
            composition,
            util:{locIdToArr}
        } = common,
        
        {
            TextBtn, componentUtil, FormInputText,
            theme:{padding, spacing, colorBgF},
            model,
            cfg:{cellSize, entitySizeM}
        } = pkg,
        
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
                color = '#333',
                shadowColor = '#000',
                hv = new View(parent, {
                    height:cellSize, pointerEvents:'none', visible:false,
                    bgColor:color, opacity:0.8, boxShadow:[0,0,8,shadowColor], 
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
        };
    
    pkg.GamePanel = new JS.Class('GamePanel', pkg.BaseStackablePanel, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gamePanel = pkg.gamePanel = this;
            
            gamePanel.callSuper();
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: v => {
            gamePanel.callSuper(v);
            
            if (gamePanel.visible) {
                websocket = pkg.websocketUtil.connectToWebsocket();
                componentUtil.reparentWorldClockView(titleHeader);
                componentUtil.reparenSocketStatusIndicator(titleHeader);
                
                character = model.getCharacterInPlay();
                gameMap.setCharacter(character);
                
                const hasCreatorPerm = character.hasPermission('creator');
                for (const view of [alterCellBtn, alterCellCompositionSelector, teleportBtn, teleportLocField]) {
                    view.setVisible(hasCreatorPerm);
                }
                
                titleHeader.setTitle('Playing As: <b>' + character[FIELD_NAME] + '</b>');
                
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
        
        
        // Methods /////////////////////////////////////////////////////////////
        /** @private */
        _keyDown: event => {
            const domEvent = event.value,
                srcView = M.DomObserver.getSourceViewFromEvent(domEvent);
            if (
                // Don't handle keys from native form elements.
                !srcView || !(srcView.isA(M.BaseInputText) || srcView.isA(M.InputSelect))
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
            gamePanel.buildHeader(titleHeader = new pkg.TitleHeader(gamePanel, {}));
            gamePanel.buildContent(contentView = new View(gamePanel, {bgColor:'#000', percentOfParentWidth:100, layoutHint:1}, [SizeToParent]));
            new ResizeLayout(gamePanel, {axis:'y'});
        },
        
        buildHeader: header => {
            const exitBtn = new TextBtn(header, {valign:'middle', text:pkg.FA_CHEVRON_LEFT + I18N('btn-exitToLobby')}, [{
                doActivated:() => {
                    pkg.app.lockUI('Leaving Ouroboros...', true);
                    websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.getId()});
                }
            }]);
            header.sendSubviewBehind(exitBtn, header.titleView, header.getFirstLayout());
            
            new View(header, {layoutHint:1});
            
            const makeCooldown = propTargetName => {
                new PaddedText(header, {valign:'middle', text:I18N('btnTxt-' + propTargetName), paddingLeft:12});
                new pkg.CharacterCooldownRadialGuage(header, {
                    y:4, propTargetName:propTargetName, tooltip:I18N('btnTip-' + propTargetName)
                });
            };
            makeCooldown(FIELD_LOCK_MOVE);
            makeCooldown(FIELD_LOCK_ACTION);
            makeCooldown(FIELD_LOCK_REACT);
            makeCooldown(FIELD_LOCK_FREE);
            
            new View(header, {width:10});
        },
        
        buildContent: content => {
            gameMap = new pkg.GameMap(content, {
                percentOfParentWidth:100, percentOfParentHeight:100,
                overflow:'hidden'
            }, [SizeToParent, {
                doCharacterCell: (character, cell, cellView) => {
                    if (curLocId !== cell.locId) {
                        curLocId = cell.locId;
                        cellHV.setVisible(false);
                    }
                    mapInfo.setText(getMapInfo(cell));
                    myLocInfo.setText('My Location: ' + getLocInfo(cell));
                }
            }]);
            
            mapInfo = new PaddedText(content, {
                x:spacing, y:spacing, padding:spacing, pointerEvents:'none',
                textColor:colorBgF, bgColor:'#0003'
            });
            
            const cellHV = buildCellHighlightView(content),
                entityHV = buildEntityHighlightView(content);
            gameMap.doMouseOverCell = cellHV.update.bind(cellHV);
            gameMap.doMouseOverEntity = entityHV.update.bind(entityHV);
            
            
            rightPanel = new View(content, {
                align:'right', width:280, percentOfParentHeight:100, bgColor:'#0003'
            }, [SizeToParent]);
            
            myLocInfo = new Text(rightPanel, {textColor:colorBgF});
            
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
        }
    });
})(orb);

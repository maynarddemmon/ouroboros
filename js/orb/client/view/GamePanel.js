(pkg => {
    let titleHeader,
        contentView,
        
        myLocInfo,
        gameMap,
        
        rightPanel,
        alterCellBtn,
        alterCellCompositionSelector,
        teleportBtn,
        teleportLocField,
        
        websocket,
        character;
    
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
                TYPE_EXIT_WORLD, TYPE_ALTER_CELL
            },
            cell:{FIELD_COMPOSITION},
            composition,
            util:{locIdToArr}
        } = common,
        
        {
            TextBtn, componentUtil, FormInputText,
            theme:{padding, spacing, colorBgF},
            model,
            cfg:{cellSize, entitySizeM}
        } = pkg,
        
        clearLocInfo = infoTxt => {infoTxt.setText();},
        
        updateLocInfo = (infoTxt, cell) => {
            infoTxt.setText('My Location: ' + getLocInfo(cell));
        },
        
        getLocInfo = cell => {
            const locArr = locIdToArr(cell.locId),
                mapDatum = model.getMapDatum(locArr[0]);
            return composition[cell[FIELD_COMPOSITION]].name + ' / ' +
                mapDatum.name + ' / level:' + locArr[3] + 
                ' / x:' + locArr[1] + ' / y:' + locArr[2];
        },
        
        getEntityInfo = entity => {
            let extraInfo = '';
            if (entity.isSpirit()) {
                extraInfo = ' : Spirit';
            } else if (entity.isZombie()) {
                extraInfo = ' : Zombie';
            }
            if (entity.inWorld) {
                extraInfo += ' : ' + ' Active Player';
            }
            return entity.name + extraInfo;
        },
        
        doArrowKey = (domEvent, direction) => {
            domEvent.preventDefault();
            if (!character.doMove(direction)) pkg.growl('info',"You can't move right now.");
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
                size = cellSize - 4*borderWidth,
                color = colorBgF,
                shadowColor = '#000',
                hv = new View(parent, {
                    height:cellSize, pointerEvents:'none', visible:false,
                    opacity:0.8, boxShadow:[0,0,8,shadowColor], zIndex:10
                }, [{
                    update: function(isOver, cell, cellView) {
                        this.setVisible(isOver);
                        if (isOver) {
                            this.setX(cellView.x);
                            this.setY(cellView.y);
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
            infoContainer = new View(hv, {x:cellSize, height:cellSize, bgColor:color});
            infoTxt = new Text(hv, {x:cellSize + spacing, valign:'middle'});
            return hv;
        };
    
    pkg.GamePanel = new JS.Class('GamePanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            pkg.gamePanel = this;
            
            this.callSuper(v);
            if (this.visible) {
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
                
                this.attachToDom(GlobalKeys, '_keyDown', 'keydown', true);
            } else {
                this.detachFromDom(GlobalKeys, '_keyDown', 'keydown', true);
                if (gameMap) {
                    gameMap.setCharacter();
                    clearLocInfo(myLocInfo);
                }
            }
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        
        
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
                    case GlobalKeys.CODE_ARROW_LEFT:  return doArrowKey(domEvent, 'left');
                    case GlobalKeys.CODE_ARROW_UP:    return doArrowKey(domEvent, 'forward');
                    case GlobalKeys.CODE_ARROW_RIGHT: return doArrowKey(domEvent, 'right');
                    case GlobalKeys.CODE_ARROW_DOWN:  return doArrowKey(domEvent, 'back');
                }
            }
            return true;
        },
        
        buildUI: function() {
            const self = this;
            self.buildHeader(titleHeader = new pkg.TitleHeader(self, {}));
            self.buildContent(contentView = new View(self, {percentOfParentWidth:100, layoutHint:1}, [SizeToParent]));
            new ResizeLayout(self, {axis:'y'});
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
            gameMap = new pkg.GameMap(content, {}, [{
                doCharacterCell: (character, cell, cellView) => {
                    updateLocInfo(myLocInfo, cell);
                }
            }]);
            
            // FIXME: hide cellHV when character location changes.
            const cellHV = buildCellHighlightView(content),
                entityHV = buildEntityHighlightView(content);
            gameMap.doMouseOverCell = cellHV.update.bind(cellHV);
            gameMap.doMouseOverEntity = entityHV.update.bind(entityHV);
            
            const rightPanelX = gameMap.x + gameMap.width + padding;
            rightPanel = new View(content, {
                x:rightPanelX, y:spacing,
                percentOfParentWidth:100, percentOfParentWidthOffset:-(rightPanelX + padding),
                percentOfParentHeight:100, percentOfParentHeightOffset:-2*spacing
            }, [SizeToParent]);
            
            myLocInfo = new Text(rightPanel, {height:20});
            
            // Alter Cell
            alterCellBtn = new TextBtn(rightPanel, {text:'Alter Cell', layoutHint:'break', visible:false}, [{
                doActivated: () => {
                    if (!character.doFree(TYPE_ALTER_CELL, {direction:'here', prop:'c', value:alterCellCompositionSelector.value})) {
                        pkg.growl('info',"You can't act right now.");
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
            teleportBtn = new TextBtn(rightPanel, {text:'Teleport', visible:false}, [{
                doActivated: () => {
                    const value = teleportLocField.value;
                    if (value && value.length >= 7 && !character.doMove(value)) {
                        pkg.growl('info',"You can't move right now.");
                    }
                }
            }]);
            teleportLocField = new FormInputText(rightPanel, {
                width:100, visible:false, maxLength:24, allowedChars:'-,0123456789',
                acceleratorScope:'root'
            },[{doAccept:teleportBtn.doActivated}]);
            
            new M.WrappingLayout(rightPanel, {spacing:12, lineSpacing:20});
        }
    });
})(orb);

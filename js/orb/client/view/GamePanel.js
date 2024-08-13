(pkg => {
    let titleHeader,
        contentView,
        
        myLocInfo,
        otherLocInfo,
        entityInfo,
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
            composition,
            util:{locIdToArr}
        } = common,
        
        {
            TextBtn, componentUtil, FormInputText,
            theme:{padding, spacing},
            model
        } = pkg,
        
        clearLocInfo = infoTxt => {infoTxt.setText();},
        
        updateLocInfo = (infoTxt, cell) => {
            const locArr = locIdToArr(cell.locId),
                mapDatum = model.getMapDatum(locArr[0]);
            infoTxt.setText(
                mapDatum.name + ' / level:' + locArr[3] + 
                ' / x:' + locArr[1] +
                ' / y:' + locArr[2] +
                ' / ' + composition[cell.c].name
            );
        },
        
        clearEntityInfo = infoTxt => {infoTxt.setText();},
        
        updateEntityInfo = (infoTxt, entity) => {
            let extraInfo = '';
            if (entity.isSpirit()) {
                extraInfo = ' : Spirit';
            } else if (entity.isZombie()) {
                extraInfo = ' : Zombie';
            }
            if (entity.inWorld) {
                extraInfo += ' : ' + ' Active Player';
            }
            infoTxt.setText(
                'Entity: ' + entity.name + extraInfo
            );
        },
        
        doArrowKey = (domEvent, direction) => {
            domEvent.preventDefault();
            if (!character.doMove(direction)) pkg.growl('info',"You can't move right now.");
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
                    clearLocInfo(otherLocInfo);
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
                doMouseOverCell: (isOver, cell, cellView) => {
                    if (isOver) {
                        updateLocInfo(otherLocInfo, cell);
                        // FIXME: use a highlight view rather than changing border.
                        cellView.setBorder([1, 'dashed', '#888']);
                        cellView.setZIndex(1);
                    } else {
                        clearLocInfo(otherLocInfo);
                        cellView.setBorder();
                        cellView.setZIndex(0);
                    }
                },
                doCharacterCell: (character, cell, cellView) => {
                    updateLocInfo(myLocInfo, cell);
                },
                
                doMouseOverEntity: (isOver, entity, entityView) => {
                    if (isOver) {
                        updateEntityInfo(entityInfo, entity);
                        // FIXME: use a highlight view rather than changing border.
                        entityView.setBorder([1, 'dashed', '#888']);
                    } else {
                        clearEntityInfo(entityInfo);
                        entityView.setBorder();
                    }
                },
            }]);
            
            
            const rightPanelX = gameMap.x + gameMap.width + padding;
            rightPanel = new View(content, {
                x:rightPanelX, y:spacing,
                percentOfParentWidth:100, percentOfParentWidthOffset:-(rightPanelX + padding),
                percentOfParentHeight:100, percentOfParentHeightOffset:-2*spacing
            }, [SizeToParent]);
            
            myLocInfo = new Text(rightPanel, {height:20});
            otherLocInfo = new Text(rightPanel, {height:20, layoutHint:'break'});
            entityInfo = new Text(rightPanel, {height:20, layoutHint:'break'});
            
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

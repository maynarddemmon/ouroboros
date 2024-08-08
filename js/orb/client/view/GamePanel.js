(pkg => {
    let titleHeader,
        contentView,
        gameMap,
        
        rightPanel,
        alterCellBtn,
        alterCellCompositionSelector,
        
        websocket,
        character;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            InputSelect,
            global:{keys:GlobalKeys}
        } = M,
        
        {
            character:{
                FIELD_NAME, 
                FIELD_LOCK_MOVEMENT, FIELD_LOCK_ACTION, FIELD_LOCK_FREE, FIELD_LOCK_REACT
            },
            greek:{
                TYPE_EXIT_WORLD, TYPE_ALTER_CELL
            },
            composition
        } = common,
        
        {
            TextBtn, componentUtil,
            theme:{padding, spacing},
            model
        } = pkg,
        
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
                alterCellBtn.setVisible(hasCreatorPerm);
                alterCellCompositionSelector.setVisible(hasCreatorPerm);
                
                titleHeader.setTitle('Playing As: <b>' + character[FIELD_NAME] + '</b>');
                
                this.attachToDom(GlobalKeys, '_keyDown', 'keydown', true);
            } else {
                this.detachFromDom(GlobalKeys, '_keyDown', 'keydown', true);
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
                !srcView || !srcView.isA(M.BaseInputText) || !srcView.isA(M.InputSelect)
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
            self.buildFooter(new pkg.Footer(self, {}));
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
        },
        
        buildContent: content => {
            gameMap = new pkg.GameMap(content);
            
            const rightPanelX = gameMap.x + gameMap.width + padding;
            rightPanel = new View(content, {
                x:rightPanelX, y:padding,
                percentOfParentWidth:100, percentOfParentWidthOffset:-(rightPanelX + padding),
                percentOfParentHeight:100, percentOfParentHeightOffset:-2*padding,
            }, [SizeToParent]);
            
            new pkg.CharacterCooldownRadialGuage(rightPanel, {
                propTargetName:FIELD_LOCK_MOVEMENT, tooltip:'Movement Cooldown'
            });
            new pkg.CharacterCooldownRadialGuage(rightPanel, {
                propTargetName:FIELD_LOCK_ACTION, tooltip:'Action Cooldown'
            });
            new pkg.CharacterCooldownRadialGuage(rightPanel, {
                propTargetName:FIELD_LOCK_REACT, tooltip:'Reaction Cooldown'
            });
            new pkg.CharacterCooldownRadialGuage(rightPanel, {
                propTargetName:FIELD_LOCK_FREE, tooltip:'Free Action Cooldown'
            });
            
            alterCellBtn = new TextBtn(rightPanel, {text:'Alter Cell', visible:false}, [{
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
            
            new M.WrappingLayout(rightPanel, {spacing:2*spacing, lineSpacing:2*spacing});
        },
        
        buildFooter: footer => {
            new TextBtn(footer, {valign:'middle', text:pkg.FA_CHEVRON_LEFT + ' Exit to Lobby'}, [{
                doActivated:() => {
                    pkg.app.lockUI('Leaving Ouroboros...', true);
                    websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.getId()});
                }
            }]);
        }
    });
})(orb);

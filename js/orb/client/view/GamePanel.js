(pkg => {
    let titleHeader,
        contentView,
        gameMap,
        
        rightPanel,
        
        websocket,
        character;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:{keys:GlobalKeys}
        } = M,
        
        {character:{FIELD_NAME}} = common,
        
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
                propTargetName:common.character.FIELD_LOCK_MOVEMENT, tooltip:'Movement Cooldown'
            });
        },
        
        buildFooter: footer => {
            new TextBtn(footer, {valign:'middle', text:pkg.FA_CHEVRON_LEFT + ' Exit to Lobby'}, [{
                doActivated:() => {
                    pkg.app.lockUI('Leaving Ouroboros...', true);
                    websocket.sendTypedMessage(common.greek.TYPE_EXIT_WORLD, {id:character.id});
                }
            }]);
        }
    });
})(orb);

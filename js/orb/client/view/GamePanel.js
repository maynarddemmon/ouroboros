(pkg => {
    let titleHeader,
        contentView,
        gameMap,
        websocket,
        character;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:{keys:GlobalKeys}
        } = M,
        
        {TYPE_EXIT_WORLD} = common.greek,
        
        {
            TextBtn,
            theme:{padding, spacing},
            model
        } = pkg,
        
        preventDefault = domEvent => {
            domEvent.preventDefault();
        },
        
        doArrowKey = (domEvent, direction) => {
            preventDefault(domEvent);
            if (!model.characterDoMove(character, direction)) {
                pkg.growl('info',"You can't move right now.");
            }
        };
    
    pkg.GamePanel = new JS.Class('GamePanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                pkg.connectToWebsocket();
                websocket = pkg.websocket;
                pkg.reparentWorldClockView(titleHeader);
                pkg.reparenSocketStatusIndicator(titleHeader);
                
                character = model.getCharacterInPlay();
                gameMap.setCharacter(character);
                
                titleHeader.setTitle('Playing As: ' + character.name);
                
                this.attachToDom(GlobalKeys, '_keyDown', 'keydown', true);
            } else {
                this.detachFromDom(GlobalKeys, '_keyDown', 'keydown', true);
            }
        },
        
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
            self.buildFooter(self.footer = new pkg.Footer(self, {}));
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
        },
        
        buildContent: content => {
            gameMap = new pkg.GameMap(content, {
                x:padding, y:padding,
                percentOfParentWidth:50, percentOfParentWidthOffset:-padding,
                percentOfParentHeight:100, percentOfParentHeightOffset:-2*padding,
            }, [SizeToParent]);
        },
        
        buildFooter: footer => {
            new TextBtn(footer, {valign:'middle', text:pkg.FA_CHEVRON_LEFT + ' Exit to Lobby'}, [{
                doActivated:() => {
                    pkg.app.lockUI('Leaving Ouroboros...', true);
                    websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.id});
                }
            }]);
        }
    });
})(orb);

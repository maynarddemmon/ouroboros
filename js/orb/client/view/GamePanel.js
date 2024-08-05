(pkg => {
    let titleHeader,
        contentView,
        gameMap,
        character;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:G
        } = M,
        
        {TYPE_EXIT_WORLD} = common.greek,
        
        {
            TextBtn,
            theme:{padding, spacing},
            model
        } = pkg;
    
    pkg.GamePanel = new JS.Class('GamePanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                pkg.connectToWebsocket();
                pkg.reparentWorldClockView(titleHeader);
                pkg.reparenSocketStatusIndicator(titleHeader);
                
                character = model.getCharacterInPlay();
                gameMap.setCharacter(character);
                
                titleHeader.setTitle('Playing As: ' + character.name);
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
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
                    pkg.websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.id});
                }
            }]);
        }
    });
})(orb);

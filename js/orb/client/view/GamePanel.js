(pkg => {
    let socketConnectedTxt,
        character;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:G
        } = M,
        
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
                socketConnectedTxt?.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
                
                character = model.getCharacterInPlay();
            } else {
                socketConnectedTxt?.detachFrom(pkg.websocket, 'onWebsocketStatus', 'status');
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        buildUI: function() {
            const self = this;
            self.buildHeader(self.header = new pkg.Header(self, {}));
            self.gameSpace = new View(self, {percentOfParentWidth:100, layoutHint:1}, [SizeToParent]);
            self.buildFooter(self.footer = new pkg.Footer(self, {}));
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
            
            socketConnectedTxt = pkg.makeSocketStatusIndicator(header);
        },
        
        buildFooter: footer => {
            new View(footer, {layoutHint:1});
            
            new TextBtn(footer, {valign:'middle', text:pkg.FA_CHEVRON_LEFT + ' Exit to Lobby'}, [{
                doActivated:() => {
                    pkg.app.lockUI('Leaving Ouroboros...', true);
                    pkg.websocket.sendTypedMessage(greek.TYPE_EXIT_WORLD, {id:character.id});
                }
            }]);
        }
    });
})(orb);

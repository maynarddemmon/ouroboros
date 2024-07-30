(pkg => {
    let socketConnectedTxt;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:G
        } = M,
        
        {
            TextBtn,
            theme:{padding, spacing, cornerRadius, headerHeight, colorBgRow}
        } = pkg,
        
        CharacterRow = new JS.Class('CharacterRow', pkg.WideFlowComponent, {
            initNode: function(parent, attrs) {
                const self = this;
                
                self.quickSet(['character'], attrs);
                
                attrs.height = headerHeight;
                attrs.bgColor = colorBgRow;
                attrs.roundedCorners = cornerRadius;
                
                self.callSuper(parent, attrs);
                
                const character = self.character;
                if (character) {
                    new TextBtn(self, {valign:'middle', text:'Play Character', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME')
                        }
                    }]);
                    new Text(self, {valign:'middle', text:character.name, layoutHint:1});
                    new TextBtn(self, {valign:'middle', text:'Delete Character', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME')
                        }
                    }]);
                } else {
                    new TextBtn(self, {valign:'middle', text:'New Character', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME')
                        }
                    }]);
                }
            }
        });
    
    pkg.LobbyPanel = new JS.Class('LobbyPanel', pkg.BaseStackablePanel, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            this.callSuper(parent, attrs);
            
            const model = pkg.model;
            this.constrain('_updateCharacterContainer', [model, 'characters', model, 'characterContainer']);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                pkg.connectToWebsocket();
                socketConnectedTxt?.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
            } else {
                socketConnectedTxt?.detachFrom(pkg.websocket, 'onWebsocketStatus', 'status');
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        buildUI: function() {
            const self = this;
            self.buildHeader(self.header = new pkg.TitleHeader(self, {title:'Lobby'}));
            const wrapper = self.middle = new pkg.WideMiddle(self, {overflow:'autoy'});
            const characterContainer = self.characterContainer = new View(wrapper, {
                x:padding, y:padding, percentOfParentWidth:100, percentOfParentWidthOffset:-2*padding
            }, [SizeToParent]);
            new SpacedLayout(characterContainer, {axis:'y', spacing:spacing, outset:padding, collapseParent:true});
            
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
            
            socketConnectedTxt = pkg.makeSocketStatusIndicator(header);
            new TextBtn(header, {valign:'middle', text:pkg.FA_LOGOUT + ' ' + I18N('logout')}, [{
                doActivated:pkg.doDeathRequest
            }]);
        },
        
        _updateCharacterContainer: M.debounce(function(ignoredEvent) {
            const {maxCharacters, characters} = pkg.model,
                characterContainer = this.characterContainer;
            
            characterContainer.destroyAllSubviews();
            for (let i = 0; i < maxCharacters; i++) {
                new CharacterRow(characterContainer, {character:characters[i]});
            }
        }, 100)
    });
})(orb);

(pkg => {
    let socketConnectedTxt,
        titleHeader,
        characterContainer,
        newCharNameField;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:G
        } = M,
        
        {
            TextBtn, FormInputText, FieldErrorTextMixin,
            theme:{
                padding, spacing, cornerRadius, headerHeight, 
                colorBgHeader, colorBgRow
            }
        } = pkg,
        
        FIELD_WIDTH = 300,
        
        refreshLobby = () => {
            titleHeader?.setTitle(I18N('title-lobby', pkg.username));
            
            if (characterContainer) {
                const {maxCharacters, characters} = pkg.model;
                
                characterContainer.destroyAllSubviews();
                for (let i = 0; i < maxCharacters; i++) {
                    new CharacterRow(characterContainer, {character:characters[i]});
                }
            }
        },
        
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
                    self.playBtn = new TextBtn(self, {valign:'middle', text:'Play Character', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME');
                        }
                    }]);
                    self.detailsBtn = new TextBtn(self, {valign:'middle', text:'View Details', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME');
                        }
                    }]);
                    new Text(self, {valign:'middle', text:character.name, layoutHint:1});
                    self.deleteBtn = new TextBtn(self, {valign:'middle', text:'Delete Character', width:150}, [{
                        doActivated:() => {
                            pkg.showDeleteDialog(
                                'Are you sure you want to delete the character named "' + self.character.name + '"',
                                'Delete Character',
                                () => {
                                    pkg.app.lockUI('Deleting Character...', true);
                                    pkg.websocket.sendTypedMessage('deleteCharacter', {id:self.character.id});
                                }
                            );
                            
                        }
                    }]);
                } else {
                    self.newBtn = new TextBtn(self, {valign:'middle', text:'New Character', width:150}, [{
                        doActivated:self.enterCharacterCreator.bind(self)
                    }]);
                }
            },
            
            setDisabled: function(v) {
                const self = this;
                self.playBtn?.setDisabled(v);
                self.detailsBtn?.setDisabled(v);
                self.deleteBtn?.setDisabled(v);
                self.newBtn?.setDisabled(v);
            },
            
            enterCharacterCreator: function() {
                const self = this;
                
                for (const sv of characterContainer.getSubviews()) {
                    if (sv !== self) sv.setDisabled(true);
                }
                
                self.stopActiveAnimators();
                self.newBtn.setVisible(false);
                self.buildFormContainer();
                const value = {name:''};
                self.formContainer.setup(value, value, value);
                self.animate({attribute:'height', to:300, duration:350}).next(success => {
                    newCharNameField.focus();
                    const cancelBtn = self.cancelBtn;
                    if (cancelBtn) {
                        cancelBtn.setVisible(true);
                    } else {
                        self.cancelBtn = new TextBtn(self, {y:padding, text:pkg.FA_CLOSE + ' Cancel', width:150}, [{
                            doActivated:self.exitCharacterCreator.bind(self)
                        }]);
                    }
                });
            },
            
            buildFormContainer: function() {
                const self = this;
                let formWrapper = self.formWrapper;
                if (formWrapper) {
                    formWrapper.setVisible(true);
                } else {
                    formWrapper = self.formWrapper = new View(self, {
                        x:padding, y:headerHeight, 
                        percentOfParentWidth:100, percentOfParentWidthOffset:-2*padding,
                        percentOfParentHeight:100, percentOfParentHeightOffset:-(headerHeight + padding),
                        bgColor:colorBgHeader, roundedCorners:cornerRadius, ignoreLayout:true,
                        overflow:'autoy'
                    }, [SizeToParent]);
                    
                    const formContainer = self.formContainer = new View(formWrapper, {x:padding, y:padding}, [M.RootForm]);
                    
                    new Text(formContainer, {text:'New Character Name'});
                    newCharNameField = new FormInputText(formContainer, {
                        id:'name', form:formContainer, width:FIELD_WIDTH,
                        maxLength:256, validators:['required'], placeholder:'Enter name',
                        errorTxtHeight:20
                    }, [FieldErrorTextMixin]);
                    
                    new TextBtn(formContainer, {text:'Create', width:150}, [{
                        doActivated:() => {
                            if (formContainer.isValid) {
                                pkg.app.lockUI('Creating Character...', true);
                                pkg.websocket.sendTypedMessage('createCharacter', formContainer.getValue());
                            }
                        }
                    }]);
                    
                    new SpacedLayout(formContainer, {axis:'y', spacing:spacing, outset:padding, collapseParent:true});
                }
            },
            
            exitCharacterCreator: function() {
                const self = this;
                
                for (const sv of characterContainer.getSubviews()) {
                    if (sv !== self) sv.setDisabled(false);
                }
                
                self.stopActiveAnimators();
                self.cancelBtn.setVisible(false);
                self.animate({attribute:'height', to:headerHeight, duration:350}).next(success => {
                    self.formWrapper.setVisible(false);
                    self.newBtn.setVisible(true);
                });
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
                // Clean out any existing data.
                refreshLobby();
                
                pkg.connectToWebsocket();
                socketConnectedTxt?.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
            } else {
                socketConnectedTxt?.detachFrom(pkg.websocket, 'onWebsocketStatus', 'status');
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        buildUI: function() {
            const self = this;
            self.buildHeader(titleHeader = new pkg.TitleHeader(self, {title:I18N('title-lobby')}));
            const wrapper = self.middle = new pkg.WideMiddle(self, {overflow:'autoy'});
            characterContainer = new View(wrapper, {
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
        
        _updateCharacterContainer: M.debounce(refreshLobby, 100)
    });
})(orb);

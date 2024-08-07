(pkg => {
    let titleHeader,
        characterContainer,
        newCharNameField;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, EqualFieldsValidator,
            global:G
        } = M,
        
        {TYPE_ENTER_WORLD, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER} = common.greek,
        
        {
            TextBtn, FormInputText, FieldErrorTextMixin, RevealPasswordBtn,
            formUtil:{
                makeRootForm, makeFormMessageHeader
            },
            theme:{
                padding, spacing, cornerRadius, headerHeight, 
                colorBgHeader, colorBgRow
            }
        } = pkg,
        
        FIELD_WIDTH = 350,
        
        refreshLobby = () => {
            titleHeader?.setTitle(I18N('title-lobby', pkg.username));
            
            if (characterContainer) {
                const {maxCharacters, characters} = pkg.model;
                
                characterContainer.destroyAllSubviews();
                
                let inWorldCharacter;
                for (let i = 0; i < maxCharacters; i++) {
                    const character = characters[i];
                    if (character?.isInWorld) inWorldCharacter = character;
                    new CharacterRow(characterContainer, {character:character});
                }
                
                if (inWorldCharacter && !pkg.model.getCharacterInPlay()) {
                    pkg.growl('info', 'Attempting to auto-join because one of your characters already appears to be in play.');
                    doPlay(inWorldCharacter);
                }
            }
        },
        
        doPlay = character => {
            pkg.app.lockUI('Entering Ouroboros...', true);
            pkg.websocket.sendTypedMessage(TYPE_ENTER_WORLD, {id:character.id});
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
                        doActivated:() => {doPlay(self.character);}
                    }]);
                    self.detailsBtn = new TextBtn(self, {valign:'middle', text:'View Details', width:150}, [{
                        doActivated:() => {
                            console.log('FIXME', self.character);
                        }
                    }]);
                    new Text(self, {valign:'middle', text:(character.isInWorld ? pkg.FA_GLOBE + ' ' : '') + character.name, layoutHint:1});
                    self.deleteBtn = new TextBtn(self, {valign:'middle', text:'Delete Character', width:150}, [{
                        doActivated:() => {
                            pkg.showDeleteDialog(
                                'Are you sure you want to delete the character named "' + self.character.name + '"',
                                'Delete Character',
                                () => {
                                    pkg.app.lockUI('Deleting Character...', true);
                                    pkg.websocket.sendTypedMessage(TYPE_DELETE_CHARACTER, {id:self.character.id});
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
                                pkg.websocket.sendTypedMessage(TYPE_CREATE_CHARACTER, formContainer.getValue());
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
            this.constrain('_updateCharacterContainer', [model, 'characters', model, 'maxCharacters']);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                // Clean out any existing data.
                refreshLobby();
                
                pkg.connectToWebsocket();
                pkg.reparentWorldClockView(titleHeader);
                pkg.reparenSocketStatusIndicator(titleHeader);
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
            
            self.buildFooter(footer = new pkg.Footer(self, {}));
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
        },
        
        buildFooter: header => {
            new TextBtn(header, {valign:'middle', text:pkg.FA_LOGOUT + ' ' + I18N('logout')}, [{
                doActivated:pkg.doDeathRequest
            }]);
            
            new TextBtn(header, {valign:'middle', text:I18N('changePassword')}, [{
                doActivated:() => {
                    let form,
                        passwordField,
                        newPasswordField,
                        newPasswordAgainField;
                    pkg.getDialog().showContentConfirm(
                        container => {
                            const wrapper = new View(container, {width:FIELD_WIDTH + 2*padding, height:340});
                            
                            new Text(wrapper, {
                                x:padding, width:FIELD_WIDTH, whiteSpace:'normal',
                                text:'Enter you existing password and the new password you would like to use.'
                            });
                            
                            form = makeRootForm(wrapper, msgTxt = makeFormMessageHeader(wrapper, FIELD_WIDTH));
                            
                            // Password
                            new Text(wrapper, {x:padding, text:I18N('password')});
                            container.initialFocus = passwordField = new FormInputText(wrapper, {
                                id:'password', form:form, x:padding, width:FIELD_WIDTH,
                                maxLength:256, validators:['required'], placeholder:I18N('enterPassword'),
                                password:true,
                                errorTxtHeight:20
                            }, [FieldErrorTextMixin]);
                            new RevealPasswordBtn(wrapper, {target:passwordField});
                            
                            // New Password
                            new Text(wrapper, {x:padding, text:I18N('newPassword')});
                            newPasswordField = new FormInputText(wrapper, {
                                id:'newPassword', form:form, x:padding, width:FIELD_WIDTH,
                                key:I18N('newPassword'),
                                maxLength:256, validators:['passwordStrength'], placeholder:I18N('enterPassword'),
                                password:true,
                                errorTxtHeight:20
                            }, [FieldErrorTextMixin]);
                            new RevealPasswordBtn(wrapper, {target:newPasswordField});
                            
                            // New Password Again
                            new Text(wrapper, {x:padding, text:I18N('newPasswordAgain')});
                            newPasswordAgainField = new FormInputText(wrapper, {
                                id:'newPasswordAgain', form:form, x:padding, width:FIELD_WIDTH,
                                key:I18N('newPasswordAgain'),
                                maxLength:256, validators:['passwordStrength'], placeholder:I18N('enterPassword'),
                                password:true,
                                errorTxtHeight:20
                            }, [FieldErrorTextMixin]);
                            new RevealPasswordBtn(wrapper, {target:newPasswordAgainField});
                            
                            form.addValidator(new EqualFieldsValidator('passwordsMustMatch', newPasswordField, newPasswordAgainField));
                            
                            new SpacedLayout(wrapper, {axis:'y', inset:padding, spacing:spacing});
                            
                            const value = {password:'', newPassword:'', newPasswordAgain:''};
                            form.setup(value, value, value);
                        },
                        action => {
                            if (action === 'confirmBtn') {
                                if (form.isValid) {
                                    const formValues = form.getValue();
                                    formValues.username = pkg.username;
                                    G.app.doChangePasswordRequest(formValues, (success, dataOrError) => {
                                        if (success) {
                                            pkg.growl('success', 'Your password was updated successfully.');
                                        } else {
                                            pkg.growl('failure', 'Passowrd updated Failed', dataOrError.message);
                                        }
                                    });
                                    passwordField.setValue('');
                                    newPasswordField.setValue('');
                                    newPasswordAgainField.setValue('');
                                    form.destroy();
                                    return false;
                                }
                                return true;
                            }
                        },{
                            showClose:false,
                            maxContainerHeight:550,
                            confirmTxt:I18N('changePassword'),
                            titleText:I18N('changePassword')
                        }
                    );
                }
            }]);
            
            new View(header, {layoutHint:1});
            
            new TextBtn(header, {valign:'middle', text:pkg.FA_CLOSE + ' ' + I18N('deleteAccount')}, [{
                doActivated:() => {
                    let form,
                        passwordField;
                    pkg.getDialog().showContentConfirm(
                        container => {
                            form = makeRootForm(container, msgTxt = makeFormMessageHeader(container, FIELD_WIDTH));
                            
                            new Text(container, {
                                x:padding, width:FIELD_WIDTH, whiteSpace:'normal',
                                text:'Are you sure you want to DELETE YOUR ACCOUNT?'
                            });
                            
                            new View(container, {width:FIELD_WIDTH + 2*padding, height:padding});
                            
                            // Password
                            new Text(container, {x:padding, text:I18N('password')});
                            container.initialFocus = passwordField = new FormInputText(container, {
                                id:'password', form:form, x:padding, width:FIELD_WIDTH,
                                maxLength:256, validators:['required'], placeholder:I18N('enterPassword'),
                                password:true,
                                errorTxtHeight:20
                            }, [FieldErrorTextMixin]);
                            new RevealPasswordBtn(container, {target:passwordField});
                            
                            new SpacedLayout(container, {axis:'y', inset:padding, spacing:spacing});
                            
                            const value = {password:''};
                            form.setup(value, value, value);
                        },
                        action => {
                            if (action === 'confirmBtn') {
                                if (form.isValid) {
                                    const formValues = form.getValue();
                                    formValues.username = pkg.username;
                                    G.app.doDeleteAccountRequest(formValues, (success, dataOrError) => {
                                        if (success) {
                                            pkg.cleanUpForDeauth();
                                            pkg.app.selectPanel(pkg.PANEL_ID_AUTH);
                                            pkg.growl('success', 'Account Deletion Succeeded');
                                        } else {
                                            pkg.growl('failure', 'Account Deletion Failed', dataOrError.message);
                                        }
                                    });
                                    passwordField.setValue('');
                                    form.destroy();
                                    return false;
                                }
                                return true;
                            }
                        },{
                            showClose:false,
                            confirmTxt:I18N('deleteAccount'),
                            titleText:I18N('deleteAccount')
                        }
                    );
                }
            }]);
        },
        
        _updateCharacterContainer: M.debounce(refreshLobby, 100)
    });
})(orb);

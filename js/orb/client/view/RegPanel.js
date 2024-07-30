(pkg => {
    let regForm,
        msgTxt,
        usernameField,
        passwordField,
        passwordAgainField;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, EqualFieldsValidator,
            global:G
        } = M,
        
        {
            TextBtn, FormInputText, FieldErrorTextMixin,
            formUtil:{
                makeRootForm, makeFormMessageHeader
            },
            theme:{
                padding, spacing, cornerRadius
            }
        } = pkg,
        
        WRAPPER_WIDTH = 350,
        FIELD_WIDTH = WRAPPER_WIDTH - 2*padding,
        BTN_WIDTH = 100,
        
        setMessage = msg => {
            msgTxt.setText(msg);
            msgTxt.setTextColor();
            msgTxt.setVisible(msg);
        },
        
        resetRegForm = () => {
            const value = {username:'', password:'', passwordAgain:''};
            regForm.setup(value, value, value);
        },
        
        doReg = () => {
            if (regForm.isValid) {
                setMessage();
                const formValues = regForm.getValue();
                G.app.doRegRequest(formValues, (success, dataOrError) => {
                    if (success) {
                        pkg.authenticated = true;
                        pkg.username = formValues.username;
                        pkg.socketToken = dataOrError.socketToken;
                        pkg.socketUrl = dataOrError.socketUrl;
                        G.app.selectPanel(pkg.PANEL_ID_LOBBY);
                    } else {
                        setMessage(dataOrError.message);
                        passwordField.setValue('');
                        passwordAgainField.setValue('');
                    }
                });
            }
        };
    
    pkg.RegPanel = new JS.Class('RegPanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                resetRegForm();
                usernameField.focus();
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        buildUI: function() {
            const self = this,
                wrapper = new View(self, {
                    x:padding, y:padding, width:WRAPPER_WIDTH, height:400,
                    overflow:'hidden', roundedCorners:cornerRadius
                });
            
            self.buildHeader(self.header = new pkg.TitleHeader(wrapper, {title:I18N('title-reg')}));
            self.buildContainer(self.container = new pkg.WideMiddle(wrapper, {collapse:true}));
            
            new SpacedLayout(wrapper, {axis:'y', collapseParent:true});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
            
            new TextBtn(header, {valign:'middle', text:pkg.FA_ARROW_LEFT + ' ' + I18N('title-auth')}, [{
                doActivated: () => {G.app.selectPanel(pkg.PANEL_ID_AUTH);}
            }]);
        },
        
        buildContainer: container => {
            regForm = makeRootForm(container, msgTxt = makeFormMessageHeader(container, FIELD_WIDTH));
            
            // Username
            new Text(container, {x:padding, text:I18N('username')});
            usernameField = new FormInputText(container, {
                id:'username', form:regForm, x:padding, width:FIELD_WIDTH,
                maxLength:256, validators:['required'], placeholder:I18N('enterUsername'),
                errorTxtHeight:20
            }, [FieldErrorTextMixin, {doAccept:doReg}]);
            
            // Password
            new Text(container, {x:padding, text:I18N('password')});
            passwordField = new FormInputText(container, {
                id:'password', form:regForm, x:padding, width:FIELD_WIDTH,
                key:I18N('password'),
                maxLength:256, validators:['passwordStrength'], placeholder:I18N('enterPassword'),
                password:true,
                errorTxtHeight:20
            }, [FieldErrorTextMixin, {doAccept:doReg}]);
            new pkg.RevealPasswordBtn(container, {target:passwordField});
            
            // Password Again
            new Text(container, {x:padding, text:I18N('passwordAgain')});
            passwordAgainField = new FormInputText(container, {
                id:'passwordAgain', form:regForm, x:padding, width:FIELD_WIDTH,
                key:I18N('passwordAgain'),
                maxLength:256, validators:['passwordStrength'], placeholder:I18N('enterPassword'),
                password:true,
                errorTxtHeight:20
            }, [FieldErrorTextMixin, {doAccept:doReg}]);
            new pkg.RevealPasswordBtn(container, {target:passwordAgainField});
            
            regForm.addValidator(new EqualFieldsValidator('passwordsMustMatch', passwordField, passwordAgainField));
            
            new TextBtn(container, {
                x:padding + FIELD_WIDTH - BTN_WIDTH, width:BTN_WIDTH,
                text:pkg.FA_LOGIN + ' ' + I18N('create')
            }, [{doActivated:doReg}]);
        }
    });
})(orb);

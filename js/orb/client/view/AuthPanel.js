(pkg => {
    let authForm,
        msgTxt,
        usernameField,
        passwordField;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout,
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
        
        resetAuthForm = () => {
            const value = {username:'', password:''};
            authForm.setup(value, value, value);
        },
        
        doAuth = () => {
            if (authForm.isValid) {
                setMessage();
                const formValues = authForm.getValue();
                G.app.doAuthRequest(formValues, (success, dataOrError) => {
                    if (success) {
                        pkg.authenticated = true;
                        pkg.username = formValues.username;
                        pkg.socketToken = dataOrError.socketToken;
                        pkg.socketUrl = dataOrError.socketUrl;
                        G.app.selectPanel(pkg.PANEL_ID_LOBBY);
                    } else {
                        setMessage(dataOrError.message);
                        passwordField.setValue('');
                    }
                });
            }
        };
    
    pkg.AuthPanel = new JS.Class('AuthPanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                resetAuthForm();
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
            
            self.buildHeader(self.header = new pkg.TitleHeader(wrapper, {title:I18N('title-auth')}));
            self.buildContainer(self.container = new pkg.WideMiddle(wrapper, {collapse:true}));
            
            new SpacedLayout(wrapper, {axis:'y', collapseParent:true});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
            
            new TextBtn(header, {valign:'middle', text:I18N('title-reg') + ' ' + pkg.FA_ARROW_RIGHT}, [{
                doActivated: () => {G.app.selectPanel(pkg.PANEL_ID_REG);}
            }]);
        },
        
        buildContainer: container => {
            authForm = makeRootForm(container, msgTxt = makeFormMessageHeader(container, FIELD_WIDTH));
            
            // Username
            new Text(container, {x:padding, text:I18N('username')});
            usernameField = new FormInputText(container, {
                id:'username', form:authForm, x:padding, width:FIELD_WIDTH,
                maxLength:256, validators:['required'], placeholder:I18N('enterUsername'),
                errorTxtHeight:20
            }, [FieldErrorTextMixin, {doAccept:doAuth}]);
            
            // Password
            new Text(container, {x:padding, text:I18N('password')});
            passwordField = new FormInputText(container, {
                id:'password', form:authForm, x:padding, width:FIELD_WIDTH,
                maxLength:256, validators:['required'], placeholder:I18N('enterPassword'),
                password:true,
                errorTxtHeight:20
            }, [FieldErrorTextMixin, {doAccept:doAuth}]);
            new pkg.RevealPasswordBtn(container, {target:passwordField});
            
            new TextBtn(container, {
                x:padding + FIELD_WIDTH - BTN_WIDTH, width:BTN_WIDTH,
                text:pkg.FA_LOGIN + ' ' + I18N('login')
            }, [{doActivated:doAuth}]);
        }
    });
})(orb);

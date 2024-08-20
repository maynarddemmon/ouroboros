(pkg => {
    const {Class:JSClass, Module:JSModule} = JS,
        I18N = BABEL.get,
        
        M = myt,
        {
            View, Text, 
        } = M,
        
        {
            theme:{
                padding, spacing, cornerRadius, inputHeight, fontSizeSmall,
                colorFgError, colorFgWarning,
                colorBgError, colorBgInput,
                borderInput
            }
        } = pkg,
        
        PADDING_H = '10px',
        
        REF_WARN = 'warn',
        REF_ERROR_TXT = 'errorTxt',
        
        initFormInputAttrs = attrs => {
            attrs.height ??= inputHeight;
            attrs.border ??= borderInput;
            attrs.bgColor ??= colorBgInput;
            attrs.roundedCorners ??= cornerRadius;
            return attrs;
        },
        
        InputTextMixin = new JSModule('InputTextMixin', {
            include: [M.InputTextMouseFixMixin],
            
            
            // Life Cycle //////////////////////////////////////////////////////
            initNode: function(parent, attrs) {
                this.callSuper(parent, initFormInputAttrs(attrs));
                this.getIDS().padding = '2px ' + PADDING_H + ' 2px ' + PADDING_H;
            }
        }),
        
        showMsg = (self, msg, isError) => {
            const hasMsg = self._hasMsg = msg ? true : false;
            let warnView = self.getRef(REF_WARN);
            if (hasMsg && !warnView) {
                warnView = self.addRef(
                    REF_WARN, 
                    new Text(self.parent, {
                        y:self.y + 4, width:20, fontSize:'18px', 
                        visible:false, ignoreLayout:true
                    }, [{
                        updateX: function() {
                            this.setX(self.x + self.width - this.width - 5);
                        }
                    }])
                );
            }
            if (warnView) {
                if (hasMsg) warnView.updateX();
                warnView.setTooltip(msg);
                warnView.setText(isError ? pkg.FA_ERROR : pkg.FA_WARNING);
                warnView.setTextColor(isError ? colorFgError : colorFgWarning);
                warnView.setVisible(hasMsg && self.visible);
                self.getIDS().paddingRight = hasMsg ? '30px' : PADDING_H;
            }
        },
        
        FormInputTextMixin = new JSModule('FormInputTextMixin', {
            destroy: function() {
                const warnView = this.getRef(REF_WARN);
                if (warnView && !warnView.destroyed) warnView.destroy();
                
                this.callSuper();
            },
            
            updateUI: function() {
                const isValid = this.isValid;
                this.setBorderWidth(isValid ? 1 : 2);
                this.updateUIColors(isValid);
            },
            
            updateUIColors: function(isValid) {
                this.setBorderColor(isValid ? this.normalColor : this.errorColor);
                this.setBgColor(isValid ? colorBgInput : colorBgError);
                this.setTextColor(isValid ? '#000' : this.errorColor);
            },
            
            setVisible: function(v) {
                this.callSuper(v);
                this.getRef(REF_WARN)?.setVisible(this._hasMsg && this.visible);
            },
            
            setX: function(v) {
                this.callSuper(v);
                const warnView = this.getRef(REF_WARN);
                if (warnView?.visible) warnView.updateX();
            },
            
            setWidth: function(v) {
                this.callSuper(v);
                const warnView = this.getRef(REF_WARN);
                if (warnView?.visible) warnView.updateX();
            },
            
            showWarning: function(msg) {
                showMsg(this, msg, false);
            },
            
            showError: function(msg) {
                showMsg(this, msg, true);
            }
        });
    
    /** @class */
    pkg.FormInputText = new JSClass('FormInputText', M.FormInputText, {
        include: [InputTextMixin, FormInputTextMixin]
    });
    
    /** @class */
    pkg.FormInputTextArea = new JSClass('FormInputTextArea', M.FormInputTextArea, {
        include: [FormInputTextMixin],
        
        initNode: function(parent, attrs) {
            attrs.errorColor ??= colorFgError;
            
            this.callSuper(parent, initFormInputAttrs(attrs));
            this.getIDS().padding = '5px ' + PADDING_H + ' 5px ' + PADDING_H;
        }
    });
    
    pkg.FieldErrorText = new JSClass('FieldErrorText', Text, {
        initNode: function(parent, attrs) {
            attrs.x ??= padding;
            attrs.whiteSpace ??= 'normal';
            attrs.fontSize ??= fontSizeSmall;
            attrs.textColor ??= colorFgError;
            attrs.fontStyle ??= 'italic';
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.FieldErrorTextMixin = new JSModule('FieldErrorTextMixin', {
        initNode: function(parent, attrs) {
            const errorTxtHeight = attrs.errorTxtHeight;
            delete attrs.errorTxtHeight;
            
            this.callSuper(parent, attrs);
            const errorTxt = new pkg.FieldErrorText(parent, {visible:this.visible, width:this.width});
            if (errorTxtHeight) errorTxt.setHeight(errorTxtHeight);
            this.addRef(REF_ERROR_TXT, errorTxt);
        },
        setVisible: function(v) {
            this.callSuper(v);
            this.getRef(REF_ERROR_TXT)?.setVisible(this.visible);
        },
        setWidth: function(v) {
            this.callSuper(v);
            this.getRef(REF_ERROR_TXT)?.setWidth(this.width);
        },
        setErrorMessages: function(v) {
            this.callSuper(v);
            this.getRef(REF_ERROR_TXT).setText(v.join(' '));
        }
    });
    
    pkg.RevealPasswordBtn = new JSClass('RevealPasswordBtn', pkg.SquareBtn, {
        initNode: function(parent, attrs) {
            const self = this,
                target = self.target = attrs.target;
            delete attrs.target;
            
            attrs.drawStyle = 'textOnly';
            attrs.tooltip = I18N('showHideValue');
            attrs.ignoreLayout = true;
            
            self.callSuper(parent, attrs);
            
            self.syncTo(target, '_updateForPassword', 'password');
            self.syncTo(target, '_updateForY', 'y');
            self.constrain('_updateForX', [target, 'x', target, 'width']);
            
            target.getIDS().paddingRight = (this.width - 2) + 'px';
        },
        
        _updateForPassword: function(event) {
            this.setText(event.value ? pkg.FA_EYE_SLASH : pkg.FA_EYE);
        },
        
        _updateForX: function(event) {
            this.setX(this.target.x + this.target.width - this.width);
        },
        
        _updateForY: function(event) {
            this.setY(event.value);
        },
        
        doActivated: function() {
            this.target.setPassword(!this.target.password);
        }
    });
    
    pkg.formUtil = {
        makeRootForm: (parent, errorView) => {
            return new M.Node(parent, {errorView:errorView}, [
                M.RootForm,
                {
                    setErrorView: function(v) {
                        this.set('errorView', v, true);
                    },
                    setErrorMessages: function(v) {
                        this.callSuper(v);
                        
                        const errorView = this.errorView;
                        if (errorView) {
                            errorView.setText(v.join('<br/>'));
                            errorView.setTextColor(colorFgError);
                            errorView.setVisible(v.length > 0);
                        }
                    }
                }
            ]);
        },
        
        makeFormMessageHeader: (parent, width) => {
            const msgTxt = new Text(parent, {x:padding, width:width, whiteSpace:'normal', visible:false}),
                ids = msgTxt.getIDS();
            ids.borderBottom = borderInput[0] + 'px ' + borderInput[1] + ' ' + borderInput[2];
            ids.paddingBottom = '6px';
            return msgTxt;
        }
    };
})(orb);

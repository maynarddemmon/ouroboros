(pkg => {
    let socketConnectedBtn,
        worldClockView;
    
    const JSClass = JS.Class,
        
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent,
            FontAwesome:{registerForNotification}
        } = M,
        
        {worldTimeToParts} = common.util,
        
        {
            theme:{
                padding, spacing, headerHeight, footerHeight, inputHeight,
                fontSizeHuge,
                colorFgSuccess, colorFgWarning, colorFgError,
                colorBgHeader, colorBgPanel, colorBgMiddleComp
            }
        } = pkg,
        
        WideFlowComponent = pkg.WideFlowComponent = new JSClass('WideFlowComponent', View, {
            include: [SizeToParent],
            
            
            // Life Cycle //////////////////////////////////////////////////////
            initNode: function(parent, attrs) {
                const self = this;
                
                const collapse = attrs.collapse;
                delete attrs.collapse;
                
                const axis = attrs.axis ?? 'x';
                delete attrs.axis;
                
                attrs.percentOfParentWidth ??= 100;
                
                self.callSuper(parent, attrs);
                
                if (collapse) {
                    new SpacedLayout(self, {axis:axis, inset:padding, spacing:spacing, outset:padding, collapseParent:true});
                } else {
                    new ResizeLayout(self, {axis:axis, inset:padding, spacing:spacing, outset:padding});
                }
            }
        }),
        
        Header = pkg.Header = new JSClass('Header', WideFlowComponent, {
            initNode: function(parent, attrs) {
                attrs.height ??= headerHeight;
                attrs.bgColor ??= colorBgHeader;
                
                this.callSuper(parent, attrs);
            }
        });
    
    pkg.TitleHeader = new JSClass('TitleHeader', Header, {
        initNode: function(parent, attrs) {
            const self = this;
            
            self.callSuper(parent, attrs);
            
            self.titleView = new Text(self, {valign:'middle', text:self.title, fontSize:fontSizeHuge});
        },
        
        setTitle: function(v) {
            const self = this;
            self.set('title', v, true);
            if (self.titleView) self.titleView.setText(self.title);
        }
    });
    
    pkg.WideMiddle = new JSClass('WideMiddle', WideFlowComponent, {
        initNode: function(parent, attrs) {
            attrs.layoutHint ??= 1;
            attrs.bgColor ??= colorBgMiddleComp;
            attrs.axis ??= 'y';
            
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.Footer = new JSClass('Footer', WideFlowComponent, {
        initNode: function(parent, attrs) {
            attrs.height ??= footerHeight;
            attrs.bgColor ??= colorBgHeader;
            
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.BaseStackablePanel = new JSClass('BaseStackablePanel', View, {
        include: [M.StackablePanel],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            attrs.bgColor = colorBgPanel;
            
            this.callSuper(parent, attrs);
            this.tryToBuildUI();
        },
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            this.tryToBuildUI();
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        tryToBuildUI: function() {
            if (this.inited && this.visible && !this._uiBuilt) {
                this.buildUI();
                this._uiBuilt = true;
            }
        },
        
        buildUI: function() {
            this._uiBuilt = true;
        }
    });
    
    pkg.TextBtn = new JSClass('TextBtn', M.TextButton, {
        initNode: function(parent, attrs) {
            this.quickSet(['drawStyle'], attrs);
            
            attrs.height ??= inputHeight;
            attrs.paddingTop ??= 6;
            attrs.paddingLeft ??= 6;
            attrs.paddingRight ??= 6;
            
            //if (this.drawStyle === 'textOnly') {
                attrs.activeColor ??= '#444';
                attrs.hoverColor ??= '#666';
                attrs.readyColor ??= '#555';
                attrs.textColor ??= '#fff';
            //}
            
            this.callSuper(parent, attrs);
            
            registerForNotification(this);
        },
        
        draw: function(color, opacity=1) {
            if (this.drawStyle === 'textOnly') {
                this.setOpacity(opacity);
                this.setTextColor(color);
            } else {
                this.callSuper(color, opacity);
            }
        }
    });
    
    pkg.SquareBtn = new JSClass('TextBtn', M.TextButton, {
        initNode: function(parent, attrs) {
            this.quickSet(['drawStyle'], attrs);
            
            attrs.height ??= inputHeight;
            attrs.width ??= inputHeight;
            attrs.paddingTop ??= 6;
            attrs.textAlign ??= 'center';
            
            //if (this.drawStyle === 'textOnly') {
                attrs.activeColor ??= '#444';
                attrs.hoverColor ??= '#666';
                attrs.readyColor ??= '#555';
                attrs.textColor ??= '#fff';
            //}
            
            this.callSuper(parent, attrs);
        },
        
        draw: function(color, opacity=1) {
            if (this.drawStyle === 'textOnly') {
                this.setOpacity(opacity);
                this.setTextColor(color);
            } else {
                this.callSuper(color, opacity);
            }
        }
    });
    
    pkg.TranslucentBtn = new JS.Module('TranslucentBtn', {
        initNode: function(parent, attrs) {
            attrs.activeColor ??= '#0006';
            attrs.hoverColor ??= '#0002';
            attrs.readyColor ??= '#0004';
            attrs.pointerEvents ??= 'auto';
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.TranslucentSquareBtn = new JSClass('TranslucentSquareBtn', pkg.SquareBtn, {
        include:[pkg.TranslucentBtn]
    });
    
    pkg.BaseRadialGuage = new JSClass('BaseRadialGuage', M.RadialGuage, {
        initNode: function(parent, attrs) {
            attrs.radius ??= 18;
            attrs.borderColor ??= '#999';
            attrs.color ??= '#00f';
            attrs.bgColor ??= 'transparent';
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.BaseCTRadialGuage = new JSClass('BaseCTRadialGuage', M.ColorThresholdRadialGuage, {
        initNode: function(parent, attrs) {
            attrs.thresholds ??= [
                {color:colorFgSuccess, value:0.5},
                {color:colorFgWarning, value:0.25},
                {color:colorFgError,   value:0}
            ];
            this.callSuper(parent, attrs);
        }
    });
    
    pkg.CharacterCooldownRadialGuage = new JSClass('CharacterCooldownRadialGuage', pkg.BaseRadialGuage, {
        initNode: function(parent, attrs) {
            attrs.radius ??= 16;
            attrs.thickness ??= 1;
            attrs.color ??= '#06f';
            attrs.bgColor ??= '#0008';
            attrs.borderColor ??= '#888';
            
            attrs.readyIcon ??= pkg.FA_READY;
            attrs.cooldownName ??= '';
            
            this.quickSet(['propTargetName','readyIcon', 'cooldownName'], attrs);
            this.callSuper(parent, attrs);
            
            this.syncTo(pkg.model, 'characterInPlayChanged', 'characterInPlay');
        },
        
        characterInPlayChanged: function(event) {
            this.reset();
        },
        
        reset: function() {
            const model = pkg.model;
            if (this.propTarget) {
                this.detachFrom(model, 'notifyWorldClockTime', 'worldClockTime');
                this.detachFrom(this.propTarget, 'targetPropChanged', this.propTargetName);
            }
            
            const propTarget = this.propTarget = model.getCharacterInPlay();
            if (propTarget) this.attachTo(propTarget, 'targetPropChanged', this.propTargetName);
        },
        
        targetPropChanged: function(event) {
            const model = pkg.model;
            this.setMaxValue(event.value - model.worldClockTime);
            if (!this.isAttachedTo(model, 'notifyWorldClockTime', 'worldClockTime')) {
                this.syncTo(model, 'notifyWorldClockTime', 'worldClockTime');
            }
        },
        
        notifyWorldClockTime: function(event) {
            const model = pkg.model,
                newValue = this.propTarget[this.propTargetName] - event.value;
            this.setValue(newValue);
            if (newValue <= 0) this.detachFrom(model, 'notifyWorldClockTime', 'worldClockTime');
        },
        
        getTooltipByValue: function(value) {
            if (value > 0) {
                return '' + value + ' ticks of the clock until the ' + this.cooldownName + ' cooldown is ready.';
            } else {
                return 'The ' + this.cooldownName + ' cooldown is ready.';
            }
        },
        
        getTextByValue: function(value) {
            return value > 0 ? this.callSuper(value) : this.readyIcon;
        }
    });
    
    pkg.componentUtil = {
        reparentWorldClockView: parent => {
            if (worldClockView) {
                worldClockView.setParent(parent);
            } else {
                worldClockView = new Text(parent, {valign:'middle', fontFamily:'monospace'}, [{
                    onWorldClockTime: function(event) {
                        this.setText(worldTimeToParts(event.value, true) + ' ' + pkg.FA_CLOCK);
                    }
                }]);
                worldClockView.syncTo(pkg.model, 'onWorldClockTime', 'worldClockTime');
            }
        },
        
        /** Moves the socketStatusIndicator to the provided View. Lazy
            instantiates it as well. */
        reparentSocketStatusIndicator: parent => {
            if (socketConnectedBtn) {
                socketConnectedBtn.setParent(parent);
            } else {
                socketConnectedBtn = new pkg.TranslucentSquareBtn(parent, {
                    valign:'middle', text:pkg.FA_PLUG
                }, [{
                    onWebsocketStatus: function(event) {
                        const status = event.value;
                        if (status === 'open') {
                            this.setDisabled(true);
                            this.setTooltip('Socket connected.');
                            this.setTextColor(colorFgSuccess);
                        } else {
                            this.setDisabled(pkg.gamePanel?.visible === true ? false : true);
                            this.setTooltip('Socket not connected. Click to try to reconnect.');
                            this.setTextColor(colorFgError);
                        }
                    },
                    doActivated: function() {
                        // Try to restore the websocket.
                        const websocket = pkg.websocket;
                        if (websocket) {
                            this.detachFrom(websocket, 'onWebsocketStatus', 'status');
                            websocket.destroy();
                            pkg.websocket = null;
                        }
                        pkg.websocketUtil.connectToWebsocket();
                        this.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
                    }
                }]);
                socketConnectedBtn.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
            }
        },
    }
})(orb);

(pkg => {
    const JSClass = JS.Class,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent
        } = M,
        
        {
            theme:{
                padding, spacing, headerHeight, footerHeight, inputHeight,
                fontSizeHuge,
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
            
            M.FontAwesome.registerForNotification(this);
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
})(orb);

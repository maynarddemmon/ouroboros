(pkg => {
    let appView,
        lockCount = 0, // number: Indicates if the UI should be locked or not.
        lockView; // myt.Dimmer: The component that prevents user interaction.
    
    const M = myt,
        {
            View, Text, PanelStack, 
            SpacedLayout, ResizeLayout, SizeToParent, SizeToWindow, 
            doFetch,
            global:G
        } = M,
        {mouse:GlobalMouse} = G,
        
        {
            PANEL_ID_REG, PANEL_ID_AUTH, PANEL_ID_LOBBY, PANEL_ID_GAME,
        
            theme:{
                padding, spacing, cornerRadius
            }
        } = pkg,
        
        doPost = (url, formValues, callback) => {
            doFetch(
                url, 
                {
                    headers:{'Content-Type':'application/json'},
                    method:'POST',
                    body:JSON.stringify(formValues)
                },
                false, 
                responseData => {callback?.(true, responseData);},
                errorObj => {callback?.(false, errorObj);}, 
                () => {appView.unlockUI();}
            );
        };
    
    pkg.App = new JS.Class('App', PanelStack, {
        include: [SizeToWindow],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            appView = pkg.app = this;
            G.register('app', appView);
            
            attrs.minWidth = 600;
            attrs.minHeight = 500;
            
            appView.callSuper(parent, attrs);
            appView.attachToDom(GlobalMouse, 'noop', 'contextmenu', true);
            
            new pkg.RegPanel(appView, {panelId:PANEL_ID_REG});
            new pkg.AuthPanel(appView, {panelId:PANEL_ID_AUTH});
            new pkg.LobbyPanel(appView, {panelId:PANEL_ID_LOBBY});
            new pkg.GamePanel(appView, {panelId:PANEL_ID_GAME});
            
            global.hideSpinner();
            
            appView.selectPanel(orb.authenticated ? PANEL_ID_LOBBY : PANEL_ID_AUTH);
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        noop: () => {},
        
        doRegRequest: (formValues, callback) => {
            appView.lockUI('Creating Account...', true);
            doPost('/reg', formValues, callback);
        },
        
        doAuthRequest: (formValues, callback) => {
            appView.lockUI('Authenticating...', true);
            doPost('/auth', formValues, callback);
        },
        
        doDeauthRequest: (formValues, callback) => {
            appView.lockUI('Logging Out...', true);
            doPost('/deauth', formValues, callback);
        },
        
        doChangePasswordRequest: (formValues, callback) => {
            appView.lockUI('Updating Password...', true);
            doPost('/changePassword', formValues, callback);
        },
        
        doDeleteAccountRequest: (formValues, callback) => {
            appView.lockUI('Deleting Account...', true);
            doPost('/deleteAccount', formValues, callback);
        },
        
        // UI Locking
        lockUI: (msg, showSpinner) => {
            if (++lockCount > 0) {
                if (!lockView) {
                    lockView = new M.Dimmer(appView);
                    
                    const padding = 20,
                        
                        // Compensate for the spinner dom element being 4px larger than the provided width.
                        adj = 2,
                        
                        container = lockView.container = new View(lockView, {
                            align:'center', valign:'middle', bgColor:'#fff', roundedCorners:cornerRadius
                        }),
                        subContainer = new View(container, {x:padding, y:padding});
                    
                    lockView.spinner = new View(subContainer, {domClass:'roundspinner', width:60, height:60, visible:false}, [{
                        setX: function(v) {this.callSuper(v - adj);},
                        setY: function(v) {this.callSuper(v - adj);}
                    }]);
                    lockView.msgView = new Text(subContainer);
                    lockView.alignLayout = new M.AlignedLayout(subContainer, {align:'center', collapseParent:true});
                    new SpacedLayout(subContainer, {axis:'y', spacing:padding, collapseParent:true});
                    lockView.sizeToChildren = new M.SizeToChildren(container, {axis:'both', paddingX:padding, paddingY:padding - adj});
                }
                
                if (!lockView.visible) {
                    lockView.show();
                    lockView.focus();
                }
                
                appView.updateLockUI(msg, showSpinner, false);
            }
        },
        
        updateLockUI: (msg, showSpinner, noResize) => {
            if (lockView) {
                const sizeToChildren = lockView.sizeToChildren,
                    alignLayout = lockView.alignLayout;
                
                if (noResize) {
                    sizeToChildren.incrementLockedCounter();
                    alignLayout.incrementLockedCounter();
                }
                lockView.container.setVisible(msg || showSpinner);
                lockView.msgView.setText(msg || '');
                lockView.overlay.setBgColor((msg || showSpinner) ? '#000' : 'transparent');
                lockView.spinner.setVisible(showSpinner);
                sizeToChildren.setPaddingY(showSpinner ? (msg ? 15 : 0) : 20);
                if (noResize) {
                    sizeToChildren.decrementLockedCounter();
                    alignLayout.decrementLockedCounter();
                }
            }
        },
        
        unlockUI: () => {
            lockCount = Math.max(0, --lockCount);
            if (lockCount === 0) lockView?.hide();
        },
        
        isLockedUI: () => lockCount > 0
    });
})(orb);

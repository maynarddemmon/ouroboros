(pkg => {
    let gameMap,
        headerOverlay,
        footerOverlay,
        leftOverlay,
        rightOverlay,
        leftPanel,
        rightPanel,
        characterTab,
        
        msgLog,
        
        mapInfo,
        myLocInfo,
        
        alterCellBtn,
        alterCellTargetSelector,
        alterCellCompositionSelector,
        teleportBtn,
        teleportLocField,
        
        character,
        curLocId;
    
    const I18N = BABEL.get,
        JSClass = JS.Class,
        
        M = myt,
        {
            View, Text, PaddedText, InputSelect, SizeToParent,
            SpacedLayout, ResizeLayout, WrappingLayout,
            global:{keys:GlobalKeys}
        } = M,
        
        {
            greek:{
                ATTR_DIRECTION,
                TYPE_EXIT_WORLD, TYPE_ALTER_CELL, TYPE_CHANGE_FACING, TYPE_VOCALIZE,
                TYPE_INTERACT_WITH_FIXTURE
            },
            facings:{NORTH, SOUTH, EAST, WEST, UP, DOWN},
            composition:{templates},
            locIdToArr
        } = common,
        
        {
            model,
            TextBtn, TranslucentSquareBtn, componentUtil, FormInputText,
            theme:{padding, spacing, cornerRadius, colorBgF},
            cfg:{cellSize, entitySizeM}
        } = pkg,
        
        overlayMargin = 4,
        overlaySize = cellSize - overlayMargin,
        tabSliderBtnHeight = cellSize,
        
        getMapInfo = cell => {
            const locArr = cell.getLocArr(),
                mapId = locArr[0],
                mapObj = model.getMap(mapId);
            return (mapObj ? mapObj.getName() : 'Pocket Dimension ' + mapId) + ' - Level ' + locArr[3];
        },
        
        getLocInfo = cell => {
            const locArr = cell.getLocArr();
            return templates[cell.hasBeenSeen() ? cell.getComposition() : 'unk'].name + ' / x:' + locArr[1] + ' / y:' + locArr[2];
        },
        
        getDirectionWordsByFacing = facing => {
            const front = 'Before you',
                back = 'Behind you',
                left = 'To your left',
                right = 'To your right',
                above = 'Above you',
                below = 'Beneath you';
            switch (facing) {
                case NORTH: return {n:front, s:back, e:right, w:left, t:above, b:below};
                case SOUTH: return {n:back, s:front, e:left, w:right, t:above, b:below};
                case EAST: return {n:left, s:right, e:front, w:back, t:above, b:below};
                case WEST: return {n:right, s:left, e:back, w:front, t:above, b:below};
            }
        },
        
        getFixtureClause = (character, fixtureIds) => {
            let accum = '';
            for (const fixtureId in fixtureIds) {
                const interactions = fixtureIds[fixtureId],
                    fixture = model.getFixtureById(fixtureId);
                
                accum += fixture.describeForCharacter(character);
                
                if (interactions) {
                    for (const interaction of interactions) {
                        accum += ' [<a href="#" onclick="orb.gamePanel.doFixtureLink(\'' + fixtureId + '\',\'' + interaction + '\'); return false;">' + interaction + '</a>]';
                    }
                }
            }
            return accum;
        },
        
        getFullLocInfo = (character, cell, interactionsAccum) => {
            const accum = [];
            
            const comp = cell.getCompositionObject();
            let cellEntry = 'All about you is ' + comp.getName();
            
            const fixtureIds = interactionsAccum.cell;
            if (fixtureIds) {
                cellEntry += '. This location contains ' + getFixtureClause(character, fixtureIds);
            }
            cellEntry += '.<br><br>';
            accum.push(cellEntry);
            
            const facing = character.getFacing();
            accum.push('You are facing ' + I18N('facing-' + facing) + '.<br><br>');
            
            
            const directionWords = getDirectionWordsByFacing(facing);
            for (const faceDir of ['n','s','e','w','t','b']) {
                const face = cell[faceDir];
                if (face) {
                    let faceEntry = directionWords[faceDir] + ' is a ' + face.getCompositionObject().getName();
                    
                    const fixtureIds = interactionsAccum[faceDir];
                    if (fixtureIds) {
                        faceEntry += ' which contains ';
                        faceEntry += getFixtureClause(character, fixtureIds);
                    }
                    
                    faceEntry += '.<br><br>';
                    
                    accum.push(faceEntry);
                }
            }
            
            return accum.join(' ');
        },
        
        getEntityInfo = entity => {
            let extraInfo = '';
            if (entity.isSpirit()) {
                extraInfo = ' : Spirit';
            } else if (entity.isAstralProjected()) {
                extraInfo = ' : Astrally Projected';
            } else if (entity.isZombie()) {
                extraInfo = ' : Zombie';
            }
            if (entity.inWorld) {
                if (entity === character) {
                    extraInfo += ' : My Character';
                } else {
                    extraInfo += ' : Active Player Character';
                }
            }
            return entity.name + extraInfo;
        },
        
        doMoveCharacter = direction => {
            if (!character.doMove(direction)) {
                gameMap.animateEntity(character.getId());
                gamePanel.appendToChatLog('<i>You can\'t move right now.</i>');
            }
        },
        
        notifyCanNotAct = entity => {
            gameMap.animateEntity(entity.getId());
            gamePanel.appendToChatLog('<i>You can\'t act right now.</i>');
        },
        
        doArrowKey = (domEvent, direction) => {
            domEvent.preventDefault();
            doMoveCharacter(direction);
        },
        
        doFacingKey = (domEvent, compassDirection) => {
            domEvent.preventDefault();
            if (compassDirection === character.getFacing()) {
                gamePanel.appendToChatLog('<i>You\'re already facing that direction.</i>');
            } else if (!character.doFree(TYPE_CHANGE_FACING, {[ATTR_DIRECTION]:compassDirection})) {
                gameMap.animateEntity(character.getId());
                gamePanel.appendToChatLog('<i>You can\'t face a different direction right now.</i>');
            }
        },
        
        buildEntityHighlightView = parent => {
            let infoContainer,
                infoTxt;
            const borderWidth = 1,
                size = cellSize - 4*borderWidth,
                hv = new View(parent, {
                    height:cellSize, pointerEvents:'none', visible:false,
                    bgColor:'#333', opacity:0.8, boxShadow:[0,0,8,'#000'], 
                    zIndex:102
                }, [{
                    update: function(isOver, entity, entityView) {
                        this.setVisible(isOver);
                        if (isOver) {
                            this.setRoundedCorners(entityView.width / 2);
                            infoTxt.setText(getEntityInfo(entity));
                            this.setWidth(infoTxt.x + infoTxt.width + padding);
                            this.setHeight(infoTxt.y + infoTxt.height + spacing);
                            
                            this.setX(gameMap.x + entityView.x - (this.width - entityView.width) / 2);
                            this.setY(entityView.y + entityView.height + cellSize / 2); // FIXME: above/below
                        }
                    }
                }]);
            infoTxt = new Text(hv, {x:padding, y:spacing, textColor:colorBgF});
            return hv;
        },
        
        buildCellHighlightView = parent => {
            let infoContainer,
                infoTxt;
            const borderWidth = 1,
                bw2x = 2*borderWidth,
                bw4x = 4*borderWidth,
                size = cellSize,
                color = colorBgF,
                shadowColor = '#000',
                hv = new View(parent, {
                    height:cellSize + bw4x, pointerEvents:'none', visible:false,
                    opacity:0.8, boxShadow:[0,0,8,shadowColor], zIndex:101
                }, [{
                    update: function(isOver, cell, cellView) {
                        this.setVisible(isOver);
                        if (isOver) {
                            this.setX(gameMap.x + cellView.x - bw2x);
                            this.setY(cellView.y - bw2x);
                            infoTxt.setText(getLocInfo(cell));
                            this.setWidth(infoTxt.x + infoTxt.width + padding);
                            infoContainer.setWidth(this.width - infoContainer.x);
                        }
                    }
                }]);
            new View(hv, {
                x:borderWidth, y:borderWidth, width:size, height:size, 
                outline:[borderWidth, 'solid', color], 
                border:[borderWidth, 'solid', shadowColor]
            });
            infoContainer = new View(hv, {x:cellSize + bw4x, height:cellSize + bw4x, bgColor:color});
            infoTxt = new Text(hv, {x:cellSize + bw4x + spacing, valign:'middle', textColor:'#000'});
            return hv;
        },
        
        updateWidth = () => {
            const w = gamePanel.width,
                mapWidth = cellSize * 19,
                overlayWidth = mapWidth - 2*overlayMargin,
                leftWidth = (w - mapWidth) / 2,
                rightWidth = leftWidth,
                mapX = leftWidth,
                overlayX = mapX + overlayMargin,
                rightPanelX = mapX + mapWidth;
            
            leftPanel.setWidth(leftWidth);
            
            gameMap.setX(leftWidth);
            gameMap.setWidth(mapWidth);
            
            leftOverlay.setX(leftWidth + overlayMargin);
            rightOverlay.setX(rightPanelX - rightOverlay.width - overlayMargin);
            
            headerOverlay.setX(overlayX);
            headerOverlay.setWidth(overlayWidth);
            footerOverlay.setX(overlayX);
            footerOverlay.setWidth(overlayWidth);
            
            rightPanel.setX(rightPanelX);
            rightPanel.setWidth(rightWidth);
        },
        
        updateHeight = () => {
            const h = gamePanel.height,
                overlayHeight = h - 2*(2*overlayMargin + overlaySize);
            leftPanel.setHeight(h);
            gameMap.setHeight(h);
            rightPanel.setHeight(h);
            
            headerOverlay.setY(overlayMargin);
            footerOverlay.setY(h - footerOverlay.height - overlayMargin);
            
            leftOverlay.setHeight(overlayHeight);
            rightOverlay.setHeight(overlayHeight);
        },
        
        LocalTabSliderContainer = new JSClass('LocalTabSliderContainer', View, {
            include: [M.TabSliderContainer],
            
            initNode: function(parent, attrs) {
                attrs.maxSelected ??= -1;
                attrs.spacing ??= 0;
                attrs.bgColor ??= '#000';
                
                this.callSuper(parent, attrs);
            },
            
            updateLayout: function(ignoredEvent, temporaryDuration) {
                const tabSliders = this.getTabSliders(),
                    openCount = this.selectedCount,
                    closedCount = tabSliders.length - openCount,
                    height = (this.height - closedCount * tabSliderBtnHeight) / openCount;
                for (const tabSlider of tabSliders) {
                    if (tabSlider.selected) {
                        tabSlider.expand(height);
                    } else {
                        tabSlider.collapse();
                    }
                }
            },
            
            deselect: function(item) {
                if (this.selectedCount > 1) this.callSuper(item);
            }
        }),
        
        LocalTabSlider = new JSClass('LocalTabSlider', M.TabSlider, {
            initNode: function(parent, attrs) {
                attrs.pointerEvents = 'auto';
                
                attrs.buttonHeight ??= tabSliderBtnHeight;
                attrs.fillColorSelected ??= '#333';
                attrs.fillColorActive ??= '#111';
                attrs.fillColorHover ??= '#333';
                attrs.fillColorReady ??= '#222';
                attrs.textColor ??= colorBgF;
                
                this.callSuper(parent, attrs);
                
                this.labelView = new Text(this.button, {
                    x:padding, ignorePlacement:true,
                    text:this.text, valign:'middle'
                });
            },
            
            // Accessors ///////////////////////////////////////////////////////
            setText: function(v) {
                if (this.text !== v) {
                    this.text = v;
                    this.labelView?.setText(v);
                }
            }
        });
    
    pkg.GamePanel = new JSClass('GamePanel', pkg.BaseStackablePanel, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gamePanel = pkg.gamePanel = this;
            gamePanel.callSuper(parent, attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: v => {
            gamePanel.callSuper(v);
            
            if (gamePanel.visible) {
                pkg.websocketUtil.connectToWebsocket();
                componentUtil.reparentWorldClockView(headerOverlay);
                headerOverlay.getFirstLayout().update();
                
                componentUtil.reparentSocketStatusIndicator(footerOverlay);
                footerOverlay.getFirstLayout().update();
                
                character = model.getCharacterInPlay();
                gameMap.setCharacter(character);
                updateWidth();
                updateHeight();
                
                const hasCreatorPerm = character.hasPermission('creator');
                for (const view of [alterCellBtn, alterCellTargetSelector, alterCellCompositionSelector, teleportBtn, teleportLocField]) {
                    view.setVisible(hasCreatorPerm);
                }
                
                characterTab.setText(pkg.FA_CHARACTER + ' ' + character.getName());
                
                gamePanel.attachToDom(GlobalKeys, '_keyDown', 'keydown', true);
            } else {
                gamePanel.detachFromDom(GlobalKeys, '_keyDown', 'keydown', true);
                if (gameMap) {
                    gameMap.setCharacter();
                    myLocInfo.setText();
                    mapInfo.setText();
                }
            }
        },
        
        setWidth: v => {
            gamePanel.callSuper(v);
            if (gamePanel.inited) updateWidth();
        },
        
        setHeight: v => {
            gamePanel.callSuper(v);
            if (gamePanel.inited) updateHeight();
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        appendToChatLog: msg => {if (msg) msgLog.appendMsg(msg);},
        
        doFixtureLink: (fixtureId, interactionName) => {
            if (!character.doAction(TYPE_INTERACT_WITH_FIXTURE, {fixtureId:fixtureId, interactionName:interactionName})) {
                gameMap.animateEntity(character.getId());
                gamePanel.appendToChatLog('<i>You can\'t perform an action right now.</i>');
            }
        },
        
        /** @private */
        _keyDown: event => {
            const domEvent = event.value,
                srcView = M.DomObserver.getSourceViewFromEvent(domEvent);
            if (
                // Don't handle keys from native form elements.
                !srcView || !(srcView.isA(M.BaseInputText) || srcView.isA(InputSelect))
            ) {
                switch (M.KeyObservable.getCodeFromEvent(event)) {
                    case GlobalKeys.CODE_ARROW_LEFT:  return doArrowKey(domEvent, WEST);
                    case GlobalKeys.CODE_ARROW_UP:    return doArrowKey(domEvent, NORTH);
                    case GlobalKeys.CODE_ARROW_RIGHT: return doArrowKey(domEvent, EAST);
                    case GlobalKeys.CODE_ARROW_DOWN:  return doArrowKey(domEvent, SOUTH);
                    
                    case GlobalKeys.CODE_W: return doFacingKey(domEvent, NORTH);
                    case GlobalKeys.CODE_A: return doFacingKey(domEvent, WEST);
                    case GlobalKeys.CODE_S: return doFacingKey(domEvent, SOUTH);
                    case GlobalKeys.CODE_D: return doFacingKey(domEvent, EAST);
                }
            }
            return true;
        },
        
        buildUI: () => {
            gamePanel.buildLeftPanel();
            gameMap = new pkg.GameMap(gamePanel, {}, [{
                doCharacterCell: (character, cell, interactionsAccum) => {
                    if (curLocId !== cell.locId) {
                        curLocId = cell.locId;
                        cellHV.setVisible(false);
                    }
                    mapInfo.setText(pkg.FA_GLOBE + ' ' + getMapInfo(cell));
                    myLocInfo.setText(getFullLocInfo(character, cell, interactionsAccum));
                }
            }]);
            gamePanel.buildOverlays();
            gamePanel.buildRightPanel();
            
            // Highlight Views
            const cellHV = buildCellHighlightView(gamePanel),
                entityHV = buildEntityHighlightView(gamePanel);
            gameMap.doMouseOverCell = cellHV.update.bind(cellHV);
            gameMap.doMouseOverEntity = entityHV.update.bind(entityHV);
            
        },
        
        buildLeftPanel: () => {
            leftPanel = new LocalTabSliderContainer(gamePanel, {persistenceId:'orb.GamePanel.leftTabIds'});
            
            // Location Tab
            const locationTab = new LocalTabSlider(leftPanel, {
                tabId:'location', text:pkg.FA_LOCATION + ' Location'
            });
            
            myLocInfo = new Text(locationTab, {
                x:spacing, whiteSpace:'normal',
                percentOfParentWidth:100, percentOfParentWidthOffset:-2*spacing,
                domClass:'expository'
            }, [SizeToParent]);
            
            new SpacedLayout(locationTab, {axis:'y', inset:spacing, spacing:spacing});
            
            // Chat Tab
            const chatTab = new LocalTabSlider(leftPanel, {
                tabId:'chat', text:pkg.FA_FREE_ACTION + ' Messages and Events',
                noWrapperContainer:true, bgColor:'#333'
            });
            
            msgLog = new PaddedText(chatTab, {
                percentOfParentWidth:100, layoutHint:1, padding:spacing, text:'',
                whiteSpace:'normal', overflow:'autoy', userUnselectable:false,
                domClass:'expository'
            }, [SizeToParent, {
                appendMsg: function(msg) {
                    this.setText(this.text + msg + '<br>');
                    const ide = this.getIDE();
                    ide.scrollTo({top:ide.scrollHeight, behavior:'smooth'});
                }
            }]);
            
            const row = new View(chatTab, {percentOfParentWidth:100, height:28}, [SizeToParent]);
            const messageField = new FormInputText(row, {
                    maxLength:80, acceleratorScope:'root', layoutHint:1
                },[{doAccept: () => {sendBtn.doActivated();}}]),
                
                sendBtn = new TextBtn(row, {width:55, text:'Send'}, [{
                    doActivated: () => {
                        const rawMsg = messageField.value;
                        if (rawMsg) {
                            // Parse "slash" commands
                            let command,
                                msg = rawMsg.trim();
                            if (msg.startsWith('/')) {
                                const parts = msg.slice(1).split(' ', 2);
                                command = parts[0];
                                msg = parts[1] ? parts[1] : '';
                            }
                            
                            let volume;
                            switch (command) {
                                case 'w': case 'whisper': volume = 1<<2; break;
                                case 'y': case 'yell':    volume = 1<<9; break;
                                case 's': case 'speak':   volume = 1<<6; break;
                                default:
                                    volume = 1<<6;
                                    msg = rawMsg;
                            }
                            
                            if (character.doFree(TYPE_VOCALIZE, {volume:volume, message:msg})) {
                                messageField.setValue('');
                            } else {
                                notifyCanNotAct(character);
                            }
                        }
                    }
                }]);
            new ResizeLayout(row, {inset:spacing, spacing:spacing, outset:spacing});
            
            new ResizeLayout(chatTab, {axis:'y', spacing:spacing, outset:spacing});
            
            leftPanel.restoreState(['location', 'chat']);
        },
        
        buildOverlays: () => {
            const Overlay = new JSClass('Overlay', View, {
                    initNode: function(parent, attrs) {
                        attrs.roundedCorners = cornerRadius + 2;
                        attrs.textColor = colorBgF;
                        attrs.pointerEvents = 'none';
                        attrs.zIndex ??= 100;
                        this.callSuper();
                    }
                }),
                
                HorizontalOverlay = new JSClass('HorizontalOverlay', Overlay, {
                    initNode: function(parent, attrs) {
                        const insets = attrs.insets ??= 12;
                        delete attrs.insets;
                        
                        attrs.height ??= overlaySize;
                        
                        this.callSuper();
                        this.getIDS().background = 'linear-gradient(to left, #0003, #0000, #0000, #0003)';
                        new ResizeLayout(this, {inset:insets, spacing:spacing, outset:insets});
                    }
                }),
                
                VerticalOverlay = new JSClass('VerticalOverlay', Overlay, {
                    initNode: function(parent, attrs) {
                        const insets = attrs.insets ??= 8;
                        delete attrs.insets;
                        
                        attrs.y = 2*overlayMargin + overlaySize;
                        attrs.width ??= overlaySize;
                        
                        this.callSuper();
                        this.getIDS().background = 'linear-gradient(to bottom, #0003, #0000, #0000, #0003)';
                        new ResizeLayout(this, {axis:'y', inset:insets, spacing:spacing, outset:insets});
                    }
                });
            
            // Header Overlay
            headerOverlay = new HorizontalOverlay(gamePanel);
            mapInfo = new Text(headerOverlay, {valign:'middle'});
            new View(headerOverlay, {layoutHint:1});
            
            // Footer Overlay
            footerOverlay = new HorizontalOverlay(gamePanel, {insets:4});
            new TranslucentSquareBtn(footerOverlay, {
                valign:'middle', text:pkg.FA_CLOSE, tooltip:'Leave Ouroboros.'
            }, [{
                doActivated:() => {
                    const confirmFunc = () => {
                        pkg.app.lockUI('Leaving Ouroboros...', true);
                        pkg.websocket.sendTypedMessage(TYPE_EXIT_WORLD, {id:character.getId()});
                    };
                    if (GlobalKeys.isShiftKeyDown()) {
                        confirmFunc();
                    } else {
                        orb.showConfirmDialog('Yes, I meant to click the exit button and leave the game world.', 'Exit Ouroboros?', 'Exit', confirmFunc);
                    }
                }
            }]);
            new View(footerOverlay, {layoutHint:1});
            
            // Left Overlay
            leftOverlay = new VerticalOverlay(gamePanel, {insets:4});
            
            const makeCooldown = (propTargetName, readyIcon) => {
                new pkg.CharacterCooldownRadialGuage(leftOverlay, {
                    x:1, propTargetName:propTargetName, cooldownName:I18N('cooldownName-' + propTargetName),
                    pointerEvents:'auto', readyIcon:readyIcon
                });
            };
            makeCooldown('lockMove', pkg.FA_MOVE);
            makeCooldown('lockAct', pkg.FA_ACTION);
            makeCooldown('lockReact', pkg.FA_REACT);
            makeCooldown('lockFree', pkg.FA_FREE_ACTION);
            
            // Right Overlay
            rightOverlay = new VerticalOverlay(gamePanel);
        },
        
        buildRightPanel: () => {
            rightPanel = new LocalTabSliderContainer(gamePanel, {persistenceId:'orb.GamePanel.rightTabIds'});
            
            characterTab = new LocalTabSlider(rightPanel, {
                tabId:'character', text:pkg.FA_CHARACTER + ' Character'
            });
            
            const inventoryTab = new LocalTabSlider(rightPanel, {
                tabId:'inventory', text:pkg.FA_INVENTORY + ' Inventory'
            });
            
            // Character Tab
            // Alter Cell
            alterCellBtn = new TextBtn(characterTab, {text:'Alter', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    if (!character.doFree(TYPE_ALTER_CELL, {
                        direction:'here', prop:alterCellTargetSelector.value, value:alterCellCompositionSelector.value
                    })) {
                        notifyCanNotAct(character);
                    }
                }
            }]);
            alterCellTargetSelector = new InputSelect(characterTab, {
                visible:false, height:28, options:[
                    {label:'cell', value:'c'},
                    {label:'north', value:NORTH + '.c'},
                    {label:'south', value:SOUTH + '.c'},
                    {label:'east', value:EAST + '.c'},
                    {label:'west', value:WEST + '.c'},
                    {label:'top', value:UP + '.c'},
                    {label:'bottom', value:DOWN + '.c'}
                ]
            });
            const options = [];
            for (const key in templates) {
                options.push({label:templates[key].name, value:key});
            }
            alterCellCompositionSelector = new InputSelect(characterTab, {
                visible:false, height:28, options:options
            });
            
            // Teleport
            teleportBtn = new TextBtn(characterTab, {text:'Teleport', visible:false, layoutHint:'break'}, [{
                doActivated: () => {
                    const value = teleportLocField.value;
                    if (value && value.length >= 7) doMoveCharacter(value);
                }
            }]);
            teleportLocField = new FormInputText(characterTab, {
                width:100, visible:false, maxLength:24, allowedChars:'-,0123456789',
                acceleratorScope:'root'
            },[{doAccept:teleportBtn.doActivated}]);
            
            new M.WrappingLayout(characterTab, {
                inset:padding, spacing:spacing, outset:padding, 
                lineInset:padding, lineSpacing:spacing, lineOutset:padding
            });
            
            rightPanel.restoreState(['character','inventory']);
        }
    });
})(orb);

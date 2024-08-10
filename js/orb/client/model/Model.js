(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const {
            Node, Eventable,
            AccessorSupport:{generateSetterName}
        } = myt,
        
        {
            greek:{TYPE_ACTION_MOVE},
            entity:{FIELD_ID},
            character:{
                FIELD_NAME, FIELD_USER_ID, FIELD_IN_WORLD, FIELD_ZOMBIE, FIELD_SPIRIT,
                FIELD_LOC, FIELD_MOVE_SPEED, FIELD_PERMISSIONS,
                FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_REACT, FIELD_LOCK_FREE
            }
        } = common
        
        CharacterModel = new JS.Class('CharacterModel', Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            [generateSetterName(FIELD_ID)]: function(v) {this.set(FIELD_ID, v, true);},
            getId: function() {return this[FIELD_ID];},
            [generateSetterName(FIELD_USER_ID)]: function(v) {this.set(FIELD_USER_ID, v, true);},
            getUserId: function() {return this[FIELD_USER_ID];},
            [generateSetterName(FIELD_NAME)]: function(v) {this.set(FIELD_NAME, v, true);},
            getName: function() {return this[FIELD_NAME];},
            [generateSetterName(FIELD_ZOMBIE)]: function(v) {this.set(FIELD_ZOMBIE, v, true);},
            isZombie: function() {return this[FIELD_ZOMBIE];},
            [generateSetterName(FIELD_SPIRIT)]: function(v) {this.set(FIELD_SPIRIT, v, true);},
            isSpirit: function() {return this[FIELD_SPIRIT];},
            [generateSetterName(FIELD_IN_WORLD)]: function(v) {this.set(FIELD_IN_WORLD, v, true);},
            isInWorld: function() {return this[FIELD_IN_WORLD];},
            [generateSetterName(FIELD_LOC)]: function(v) {this.set(FIELD_LOC, v, true);},
            getLocArr: function() {return this[FIELD_LOC];},
            [generateSetterName(FIELD_LOCK_MOVE)]: function(v) {this.set(FIELD_LOCK_MOVE, v, true);},
            getLockMove: function() {return this[FIELD_LOCK_MOVE];},
            [generateSetterName(FIELD_MOVE_SPEED)]: function(v) {this.set(FIELD_MOVE_SPEED, v, true);},
            getMoveSpeed: function() {return this[FIELD_MOVE_SPEED];},
            [generateSetterName(FIELD_LOCK_ACTION)]: function(v) {this.set(FIELD_LOCK_ACTION, v, true);},
            getLockAction: function() {return this[FIELD_LOCK_ACTION];},
            [generateSetterName(FIELD_LOCK_FREE)]: function(v) {this.set(FIELD_LOCK_FREE, v, true);},
            getLockFree: function() {return this[FIELD_LOCK_FREE];},
            [generateSetterName(FIELD_LOCK_REACT)]: function(v) {this.set(FIELD_LOCK_REACT, v, true);},
            getLockReact: function() {return this[FIELD_LOCK_REACT];},
            
            [generateSetterName(FIELD_PERMISSIONS)]: function(v) {this.set(FIELD_PERMISSIONS, v, true);},
            
            // Methods /////////////////////////////////////////////////////////
            canMove: function() {
                return this[FIELD_LOCK_MOVE] == null || this[FIELD_LOCK_MOVE] <= model.worldClockTime;
            },
            
            doMove: function(direction) {
                if (this.canMove()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's movement.
                    this[FIELD_LOCK_MOVE] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(TYPE_ACTION_MOVE, {id:this.id, direction:direction});
                    return true;
                }
                return false;
            },
            
            canAct: function() {
                return this[FIELD_LOCK_ACTION] == null || this[FIELD_LOCK_ACTION] <= model.worldClockTime;
            },
            
            doAction: function(type, params) {
                if (this.canAct()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this[FIELD_LOCK_ACTION] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            },
            
            canFree: function() {
                return this[FIELD_LOCK_FREE] == null || this[FIELD_LOCK_FREE] <= model.worldClockTime;
            },
            
            doFree: function(type, params) {
                if (this.canFree()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this[FIELD_LOCK_FREE] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            },
            
            hasPermission: function(permId) {
                const permissions = this[FIELD_PERMISSIONS];
                return permissions ? permissions.includes(permId) : false;
            }
        }),
        
        model = pkg.model = new JS.Singleton('Model', Node, {
            // Characters:start
            setMaxCharacters: v => {
                model.set('maxCharacters', v, true);
            },
            
            setCharacterInPlay: v => {model.set('characterInPlay', v, true);},
            getCharacterInPlay: () => model.characterInPlay,
            
            getCharacterById: id => {
                const characters = model.getCharacters();
                let i = characters.length;
                while (i) {
                    const character = characters[--i];
                    if (character.id === id) return character;
                }
            },
            
            getCharacters: () => model.characters ?? (model.characters = []),
            
            setCharactersFromData: data => {
                const characters = [];
                if (Array.isArray(data)) {
                    for (const datum of data) {
                        const character = new CharacterModel(datum);
                        if (character) characters.push(character);
                    }
                }
                model.set('characters', characters, true);
            },
            addCharacterFromData: datum => {
                const character = new CharacterModel(datum);
                if (character) {
                    const characters = model.getCharacters();
                    characters.push(character);
                    model.fireEvent('characters', characters);
                }
            },
            
            replaceCharacterFromData: datum => {
                const character = new CharacterModel(datum);
                if (character) {
                    const id = character.id,
                        characters = model.getCharacters();
                    let i = characters.length;
                    while (i) {
                        const existingCharacter = characters[--i];
                        if (existingCharacter.id === id) {
                            characters.splice(i, 1, character);
                            model.fireEvent('characters', characters);
                            return character;
                        }
                    }
                }
                return null;
            },
            
            removeCharacterById: id => {
                const characters = model.getCharacters();
                let i = characters.length;
                while (i) {
                    if (characters[--i].id === id) {
                        characters.splice(i, 1);
                        model.fireEvent('characters', characters);
                        return true;
                    }
                }
                return false;
            },
            // Characters:end
            
            // Time:start
            setWorldClockTick: v => {
                model.set('worldClockTick', v, true);
            },
            
            setWorldClockTime: v => {
                model.set('worldClockTime', v, true);
            },
            
            updateWorldClockTime: v => {
                if (worldClockIntervalId) clearInterval(worldClockIntervalId);
                model.setWorldClockTime(v);
                worldClockIntervalId = setInterval(() => {
                    model.setWorldClockTime(model.worldClockTime + 1);
                }, model.worldClockTick);
            },
            // Time:end
            
            // Map:start
            getMapData: () => mapData ?? (mapData = {}),
            getCellData: () => cellData ?? (cellData = {}),
            
            getMapDatum: mapId => mapData[mapId],
            getCellDatum: locId => cellData[locId],
            
            clearMapAndCellData: () => {
                mapData = {};
                model.fireEvent('mapDataCleared');
                cellData = {};
                model.fireEvent('cellDataCleared');
            },
            
            storeMapData: data => {
                const mapData = model.getMapData();
                for (const key in data) {
                    const mapDatum = mapData[key] = data[key];
                    model.fireEvent('mapChanged', mapDatum);
                }
            },
            
            storeCellData: data => {
                const cellData = model.getCellData();
                for (const key in data) {
                    const cellDatum = data[key];
                    cellDatum.locId = key;
                    cellData[key] = cellDatum;
                    model.fireEvent('cellChanged', cellDatum);
                }
            },
            // Map:end
            
            // Methods /////////////////////////////////////////////////////////
            wipeClean: () => {
                model.maxCharacters = 0;
                model.characters = [];
                model.clearMapAndCellData();
            }
        });
})(orb);

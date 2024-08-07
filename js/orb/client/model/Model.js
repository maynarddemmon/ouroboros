(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const {Node, Eventable} = myt,
        
        {TYPE_ACTION_MOVE} = common.greek,
        
        CharacterModel = new JS.Class('CharacterModel', Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setLockMovement: function(v) {this.set('lockMovement', v, true);},
            setLoc: function(v) {this.set('loc', v, true);},
            
            
            // Methods /////////////////////////////////////////////////////////
            canMove: function() {
                return this.lockMovement == null || this.lockMovement <= model.worldClockTime;
            },
            
            doMove: function(direction) {
                if (this.canMove()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's movement.
                    this.lockMovement = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(TYPE_ACTION_MOVE, {id:this.id, direction:direction});
                    return true;
                }
                return false;
            }
        }),
        
        model = pkg.model = new JS.Singleton('Model', Node, {
            // Characters:start
            setMaxCharacters: v => {
                model.set('maxCharacters', v, true);
            },
            
            setCharacterInPlay: v => {model.set('characterInPlay', v, true);},
            getCharacterInPlay: () => model.characterInPlay,
            
            /*getCharacterById: id => {
                const characters = model.getCharacters();
                let i = characters.length;
                while (i) {
                    const character = characters[--i];
                    if (character.id === id) return character;
                }
            },*/
            
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

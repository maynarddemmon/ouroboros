(pkg => {
    pkg.model = new JS.Singleton('Model', myt.Node, {
        // Accessors ///////////////////////////////////////////////////////////
        
        // Characters:start
        setMaxCharacters: function(v) {
            this.set('maxCharacters', v, true);
        },
        setCharacters: function(v) {
            this.set('characters', v, true);
        },
        getCharacters: function() {
            return this.characters ?? (this.characters = []);
        },
        getCharacterById: function(id) {
            const characters = this.getCharacters();
            let i = characters.length;
            while (i) {
                const character = characters[--i];
                if (character.id === id) return character;
            }
        },
        addCharacter: function(character) {
            const characters = this.getCharacters();
            characters.push(character);
            this.fireEvent('characters', characters);
        },
        removeCharacterById: function(id) {
            const characters = this.getCharacters();
            let i = characters.length;
            while (i) {
                if (characters[--i].id === id) {
                    characters.splice(i, 1);
                    break;
                }
            }
            this.fireEvent('characters', characters);
        },
        
        setCharacterInPlay: function(character) {
            this._characterInPlay = character;
        },
        getCharacterInPlay: function() {
            return this._characterInPlay;
        },
        
        // Characters:end
        
        setWorldClockTick: function(v) {
            this.set('worldClockTick', v, true);
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        wipeClean: function() {
            this.maxCharacters = 0;
            this.characters = [];
        }
    });
})(orb);

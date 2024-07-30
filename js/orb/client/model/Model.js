(pkg => {
    pkg.model = new JS.Singleton('Model', myt.Node, {
        // Accessors ///////////////////////////////////////////////////////////
        setMaxCharacters: function(v) {
            this.set('maxCharacters', v, true);
        },
        setCharacters: function(v) {
            this.set('characters', v, true);
        },
        addCharacter: function(character) {
            if (this.characters) {
                this.characters.push(character);
            } else {
                this.characters = [character];
            }
            this.fireEvent('characters', this.characters);
        }
    });
})(orb);

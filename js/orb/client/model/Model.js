(pkg => {
    pkg.model = new JS.Singleton('Model', myt.Node, {
        // Accessors ///////////////////////////////////////////////////////////
        setMaxCharacters: function(v) {
            this.set('maxCharacters', v, true);
        },
        setCharacters: function(v) {
            this.set('characters', v, true);
        }
    });
})(orb);

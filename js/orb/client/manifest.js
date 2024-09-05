JS.Packages(file => {
    const ORB_ROOT = global.ORB_ROOT ?? '',
        MODEL_ROOT = ORB_ROOT + 'model/',
        COMPONENT_ROOT = ORB_ROOT + 'component/',
        VIEW_ROOT = ORB_ROOT + 'view/';
    
    file(ORB_ROOT + '../../../lib/myt.js').provides('myt.all');
    
    // Package:urob
    file(ORB_ROOT + '../common/urob.js').provides('urob').requires('myt.all');
    file(ORB_ROOT + '../common/urob/time.js').provides('urob.time').requires('urob');
    file(ORB_ROOT + '../common/urob/account.js').provides('urob.account','urob.permission').requires('urob');
    file(ORB_ROOT + '../common/urob/cellOffsets.js').provides('urob.cellOffsetsByDistance').requires('urob');
    file(ORB_ROOT + '../common/urob/facing.js').provides('urob.facing').requires('urob');
    file(ORB_ROOT + '../common/urob/greek.js').provides('urob.greek').requires('urob');
    file(ORB_ROOT + '../common/urob/composition.js').provides('urob.composition').requires('urob');
    file(ORB_ROOT + '../common/urob/fixture.js').provides('urob.fixture').requires('urob.facing');
    file(ORB_ROOT + '../common/urob/MapModel.js').provides('urob.map').requires('urob');
    file(ORB_ROOT + '../common/urob/EntityModel.js').provides('urob.entity').requires('urob');
    
    file(ORB_ROOT + '../common/common.js').provides('common').requires('myt.all');
    
    // Package:orb
    file(ORB_ROOT + 'orb.js').provides('orb').requires(
        'urob.time','urob.account','urob.permission','urob.cellOffsetsByDistance', 'urob.greek',
        'urob.composition','urob.fixture','urob.map','urob.entity',
        'common'
    );
    
    file(COMPONENT_ROOT + 'WebSocket.js').provides('orb.MessageTypeWebSocket').requires('orb');
    file(COMPONENT_ROOT + 'Basic.js').provides(
        'orb.Header','orb.TitleHeader',
        'orb.WideMiddle',
        'orb.Footer',
        'orb.BaseStackablePanel',
        'orb.TextBtn', 'orb.SquareBtn'
    ).requires('orb.model');
    file(COMPONENT_ROOT + 'Form.js').provides(
        'orb.FormInputText', 'orb.FormInputTextArea', 'orb.RevealPasswordBtn'
    ).requires('orb.SquareBtn');
    
    file(MODEL_ROOT + 'Model.js').provides('orb.model').requires('orb');
    
    file(VIEW_ROOT + 'RegPanel.js').provides('orb.RegPanel').requires('orb.BaseStackablePanel','orb.FormInputText');
    file(VIEW_ROOT + 'AuthPanel.js').provides('orb.AuthPanel').requires('orb.BaseStackablePanel','orb.FormInputText','orb.RevealPasswordBtn');
    file(VIEW_ROOT + 'LobbyPanel.js').provides('orb.LobbyPanel').requires('orb.BaseStackablePanel','orb.FormInputText','orb.MessageTypeWebSocket');
    
    file(VIEW_ROOT + 'GameMap.js').provides('orb.GameMap').requires('orb');
    file(VIEW_ROOT + 'GamePanel.js').provides('orb.GamePanel').requires('orb.BaseStackablePanel','orb.MessageTypeWebSocket','orb.GameMap');
    
    file(ORB_ROOT + 'App.js').provides('orb.App').requires(
        'orb.model',
        'orb.RegPanel','orb.AuthPanel','orb.LobbyPanel','orb.GamePanel'
    );
    
    // Include Everything
    file(ORB_ROOT + 'all.js').provides('orb.all').requires('orb.App');
});

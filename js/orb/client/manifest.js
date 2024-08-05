JS.Packages(file => {
    const ORB_ROOT = global.ORB_ROOT ?? '',
        MODEL_ROOT = ORB_ROOT + 'model/',
        COMPONENT_ROOT = ORB_ROOT + 'component/',
        VIEW_ROOT = ORB_ROOT + 'view/';
    
    file(ORB_ROOT + '../../../lib/myt.js').provides('myt.all');
    
    // Common
    file(ORB_ROOT + '../common/common.js').provides('common');
    file(ORB_ROOT + '../common/SocketProtocol.js').provides('common.greek').requires('common');
    file(ORB_ROOT + '../common/util.js').provides('common.util').requires('common');
    
    // Package:orb
    file(ORB_ROOT + 'orb.js').provides('orb').requires('myt.all','common.greek','common.util');
    
    file(COMPONENT_ROOT + 'WebSocket.js').provides('orb.MessageTypeWebSocket').requires('orb');
    file(COMPONENT_ROOT + 'Basic.js').provides(
        'orb.Header','orb.TitleHeader',
        'orb.WideMiddle',
        'orb.Footer',
        'orb.BaseStackablePanel',
        'orb.TextBtn', 'orb.SquareBtn'
    ).requires('orb');
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

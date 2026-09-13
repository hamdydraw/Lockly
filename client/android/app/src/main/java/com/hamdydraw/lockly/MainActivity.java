package com.hamdydraw.lockly;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts.
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);

        // Paint the theme the web app last resolved before the WebView loads, so a
        // saved Light/Dark choice that differs from the device never flashes.
        // First launch has nothing saved yet: follow the device, like "System".
        String saved = getSharedPreferences(SystemBarsPlugin.PREFS, MODE_PRIVATE)
            .getString(SystemBarsPlugin.KEY_RESOLVED, null);
        int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean light = saved != null ? "light".equals(saved) : nightMode != Configuration.UI_MODE_NIGHT_YES;

        int color = Color.parseColor(light ? SystemBarsPlugin.LIGHT_BG : SystemBarsPlugin.DARK_BG);
        SystemBarsPlugin.apply(this, getBridge().getWebView(), light, color);
    }
}

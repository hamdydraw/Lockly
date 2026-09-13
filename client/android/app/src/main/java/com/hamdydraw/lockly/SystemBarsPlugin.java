package com.hamdydraw.lockly;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the Android status and navigation bars in step with the web theme.
 * {@code <meta name="theme-color">} does not reach the app window, so the web
 * ThemeProvider calls setTheme on every change. The last resolved theme is saved
 * so MainActivity can paint the right colour before the WebView loads.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    static final String PREFS = "lockly";
    static final String KEY_RESOLVED = "lockly.theme.resolved";
    static final String LIGHT_BG = "#F5F6FA";
    static final String DARK_BG = "#0B0D17";

    @PluginMethod
    public void setTheme(PluginCall call) {
        String resolved = call.getString("resolved");
        if (!"light".equals(resolved) && !"dark".equals(resolved)) {
            call.reject("invalid resolved");
            return;
        }
        Integer parsed = parseColor(call.getString("background"));
        if (parsed == null) {
            call.reject("invalid background");
            return;
        }

        final boolean light = "light".equals(resolved);
        final int color = parsed;
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            apply(activity, bridge.getWebView(), light, color);
            call.resolve();
        });

        getContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_RESOLVED, resolved)
            .apply();
    }

    static void apply(Activity activity, WebView webView, boolean light, int color) {
        Window window = activity.getWindow();
        View decor = window.getDecorView();
        decor.setBackgroundColor(color);
        if (webView != null) {
            webView.setBackgroundColor(color);
        }

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, decor);
        bars.setAppearanceLightStatusBars(light);
        bars.setAppearanceLightNavigationBars(light);

        // Android 15+ is edge-to-edge and ignores bar colours; the window
        // background set above shows through the bars instead.
        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(color);
            window.setNavigationBarColor(color);
        }
    }

    private static Integer parseColor(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Color.parseColor(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

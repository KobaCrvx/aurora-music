package com.aurora.music;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Aurora Music para Android: abre la app web (carpeta assets/www) dentro de un WebView.
 * Los archivos se sirven desde una direccion https "falsa" (aurora.app.local) para que el navegador interno
 * trate la app como un sitio seguro y guarde tu musica y tu personalizacion de forma permanente.
 */
public class MainActivity extends Activity {
    static final String HOST = "aurora.app.local";
    static final int REQ_FILE = 1;
    static final int REQ_NOTIF = 2;

    static MainActivity inst;

    WebView web;
    ValueCallback<Uri[]> chooser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        inst = this;

        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0B0F);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(false);

        web.addJavascriptInterface(new Bridge(), "AuroraAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u == null || !HOST.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = getAssets().open("www" + path);
                    WebResourceResponse res = new WebResourceResponse(mimeOf(path), "utf-8", in);
                    Map<String, String> h = new HashMap<String, String>();
                    h.put("Access-Control-Allow-Origin", "*");
                    res.setResponseHeaders(h);
                    return res;
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                            new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u != null && HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    chooser = null;
                    return false;
                }
                return true;
            }
        });

        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIF);
        }

        web.loadUrl("https://" + HOST + "/index.html");
    }

    static String mimeOf(String p) {
        String x = p.toLowerCase();
        if (x.endsWith(".html")) return "text/html";
        if (x.endsWith(".js")) return "text/javascript";
        if (x.endsWith(".css")) return "text/css";
        if (x.endsWith(".json")) return "application/json";
        if (x.endsWith(".webmanifest")) return "application/manifest+json";
        if (x.endsWith(".png")) return "image/png";
        if (x.endsWith(".jpg") || x.endsWith(".jpeg")) return "image/jpeg";
        if (x.endsWith(".svg")) return "image/svg+xml";
        if (x.endsWith(".ico")) return "image/x-icon";
        if (x.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (chooser != null) {
                Uri[] r = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                chooser.onReceiveValue(r);
                chooser = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /** Atras no cierra la app: la manda al fondo para que la musica siga sonando. */
    @Override
    public void onBackPressed() {
        moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        PlaybackService.stopNow(this);
        if (inst == this) inst = null;
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** Ordenes de la notificacion (anterior / pausa / siguiente) hacia la pagina. */
    static void command(final String c) {
        final MainActivity a = inst;
        if (a == null || a.web == null) return;
        if (!c.matches("toggle|play|pause|next|prev|seek:[0-9.]+")) return;
        a.web.post(new Runnable() {
            @Override
            public void run() {
                if (a.web != null) {
                    a.web.evaluateJavascript("window.auroraCmd&&window.auroraCmd('" + c + "')", null);
                }
            }
        });
    }

    /** Puente que usa la pagina para avisar que suena (titulo, artista, portada, estilo...). */
    class Bridge {
        @JavascriptInterface
        public void setState(String json) {
            PlaybackService.push(MainActivity.this, json);
        }
    }
}

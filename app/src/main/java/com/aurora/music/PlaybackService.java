package com.aurora.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Base64;
import android.widget.RemoteViews;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import org.json.JSONObject;

/**
 * Servicio en primer plano: mantiene viva la app con la pantalla apagada y publica la tarjeta de musica
 * (portada segun el reproductor elegido, barra de progreso y botones) mediante una MediaSession.
 */
public class PlaybackService extends Service {
    static final String CH = "aurora_playback";
    static final int ID = 7;

    static PlaybackService inst;
    static String pending;

    NotificationManager nm;
    PowerManager.WakeLock wl;
    MediaSession session;
    boolean foreground = false;
    String lastWk = "";
    long lastWt = 0;
    boolean playing = false;
    String title = "";
    String artist = "";
    long dur = 0, pos = 0;
    Bitmap art, cover, dpng;
    String mode = "system", skin = "modern";
    int acc = 0xFF1ED760, dcol = 0xFFFFFFFF;

    static final Handler MAIN = new Handler(Looper.getMainLooper());

    // ---- foco de audio (llamadas, otras apps) y audifonos desconectados ----
    android.media.AudioManager am;
    android.media.AudioFocusRequest focusReq;
    boolean hasFocus = false, lostTransient = false, noisyOn = false;

    final android.media.AudioManager.OnAudioFocusChangeListener focusL = new android.media.AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int ch) {
            if (ch == android.media.AudioManager.AUDIOFOCUS_LOSS) {
                lostTransient = false;
                hasFocus = false;
                MainActivity.command("pause");
            } else if (ch == android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || ch == android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                if (playing) {
                    lostTransient = true;
                    MainActivity.command("pause");
                }
            } else if (ch == android.media.AudioManager.AUDIOFOCUS_GAIN) {
                if (lostTransient) {
                    lostTransient = false;
                    MainActivity.command("play");
                }
            }
        }
    };

    final android.content.BroadcastReceiver noisy = new android.content.BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            if (android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(i.getAction())) MainActivity.command("pause");
        }
    };

    void syncFocus() {
        try {
            if (am == null) am = (android.media.AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (playing) {
                if (!noisyOn) {
                    registerReceiver(noisy, new android.content.IntentFilter(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY));
                    noisyOn = true;
                }
            } else {
                if (noisyOn) {
                    try {
                        unregisterReceiver(noisy);
                    } catch (Exception ignored) {
                    }
                    noisyOn = false;
                }
            }
        } catch (Throwable ignored) {
        }
    }

    void dropFocus() {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusReq != null) am.abandonAudioFocusRequest(focusReq);
            } else {
                am.abandonAudioFocus(focusL);
            }
        } catch (Throwable ignored) {
        }
        hasFocus = false;
    }

    static void push(final Context c, final String json) {
        MAIN.post(new Runnable() {
            @Override
            public void run() {
                push2(c, json);
            }
        });
    }

    static void push2(Context c, String json) {
        try {
            JSONObject o = new JSONObject(json);
            if (o.optString("title").length() == 0) {
                stopNow(c);
                return;
            }
            if (inst != null) {
                inst.update(o);
                return;
            }
            pending = json;
            Intent i = new Intent(c, PlaybackService.class);
            i.putExtra("p", true);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        } catch (Exception ignored) {
        }
    }

    static Bitmap decode(String dataUrl) {
        if (dataUrl == null || dataUrl.length() == 0) return null;
        try {
            int k = dataUrl.indexOf(',');
            byte[] b = Base64.decode(k >= 0 ? dataUrl.substring(k + 1) : dataUrl, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(b, 0, b.length);
        } catch (Exception e) {
            return null;
        }
    }

    static void stopNow(Context c) {
        try {
            c.stopService(new Intent(c, PlaybackService.class));
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        inst = this;
        nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "Reproduccion", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "aurora:playback");
        wl.setReferenceCounted(false);

        session = new MediaSession(this, "AuroraMusic");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { MainActivity.command("play"); }
            @Override public void onPause() { MainActivity.command("pause"); }
            @Override public void onSkipToNext() { MainActivity.command("next"); }
            @Override public void onSkipToPrevious() { MainActivity.command("prev"); }
            @Override public void onSeekTo(long p) { MainActivity.command("seek:" + (p / 1000.0)); }
        });
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String c = intent.getStringExtra("c");
        if (c != null) {
            MainActivity.command(c);
            return START_NOT_STICKY;
        }
        String js = intent.getBooleanExtra("p", false) ? pending : intent.getStringExtra("json");
        if (js != null) {
            try {
                update(new JSONObject(js));
            } catch (Throwable ignored) {
            }
            if (!foreground) {
                try {
                    show(buildSystem());
                } catch (Throwable ignored) {
                }
            }
        }
        return START_NOT_STICKY;
    }

    void update(JSONObject o) {
        this.playing = o.optBoolean("playing");
        this.title = o.optString("title");
        this.artist = o.optString("artist");
        this.dur = o.optLong("dur");
        this.pos = o.optLong("pos");
        this.mode = o.optString("mode", "system");
        this.skin = o.optString("skin", "modern");
        try {
            this.acc = Color.parseColor(o.optString("acc", "#1ed760"));
        } catch (Exception e) {
            this.acc = 0xFF1ED760;
        }
        try {
            this.dcol = Color.parseColor(o.optString("dcol", "#ffffff"));
        } catch (Exception e) {
            this.dcol = 0xFFFFFFFF;
        }
        if (o.has("art")) this.art = decode(o.optString("art"));
        if (o.has("cov")) this.cover = decode(o.optString("cov"));
        if (o.has("dpng")) {
            this.dpng = decode(o.optString("dpng"));
            SkinUi.saveDpng(this, this.dpng);
        }

        try {
        MediaMetadata.Builder md = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, this.title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, this.artist)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, dur > 0 ? dur : -1);
        Bitmap meta = ("skin".equals(mode) && this.art != null) ? this.art : (this.cover != null ? this.cover : this.art);
        if (meta != null) md.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, meta);
        session.setMetadata(md.build());

        long acts = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO;
        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(acts)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, pos, playing ? 1f : 0f, SystemClock.elapsedRealtime())
                .build());
        } catch (Throwable ignored) {
        }

        // 1) tarjeta de musica del sistema (pantalla de bloqueo y panel), con la portada
        try {
            show(buildSystem());
        } catch (Throwable e2) {
            // sin notificacion la musica sigue sonando
        }
        // 2) notificacion con el diseno de tu reproductor (solo en el panel)
        refreshSkin();
        try {
            String wk = playing + "|" + title + "|" + skin + "|" + acc + "|" + (cover != null ? cover.hashCode() : 0);
            long now = SystemClock.elapsedRealtime();
            if (!wk.equals(lastWk) || now - lastWt > 10000) {
                lastWk = wk;
                lastWt = now;
                SkinUi.save(this, playing, title, artist, skin, dur, pos, acc, dcol, cover);
                AuroraWidget.refresh(this);
            }
        } catch (Throwable ignored) {
        }
        syncFocus();
        if (playing) {
            if (!wl.isHeld()) wl.acquire(10 * 60 * 60 * 1000L);
        } else if (wl.isHeld()) {
            wl.release();
        }
    }

    void show(Notification n) {
        if (!foreground) {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(ID, n);
            }
            foreground = true;
        } else {
            nm.notify(ID, n);
        }
    }

    PendingIntent cmd(String c, int code) {
        Intent i = new Intent(this, PlaybackService.class);
        i.putExtra("c", c);
        return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    Notification.Action action(int res, String label, String c, int code) {
        return new Notification.Action.Builder(Icon.createWithResource(this, res), label, cmd(c, code)).build();
    }

    static final int SKIN_ID = 8;

    void refreshSkin() {
        try {
            boolean safe = getSharedPreferences("crash", MODE_PRIVATE).getBoolean("safe", false);
            if ("skin".equals(mode) && !safe) {
                nm.notify(SKIN_ID, buildSkin());
            } else {
                nm.cancel(SKIN_ID);
            }
        } catch (Throwable ignored) {
        }
    }

    Notification build() {
        boolean safe = getSharedPreferences("crash", MODE_PRIVATE).getBoolean("safe", false);
        if ("skin".equals(mode) && !safe) {
            try {
                return buildSkin();
            } catch (Exception e) {
                // si algo falla con el diseno propio, se usa el estandar
            }
        }
        return buildSystem();
    }

    Notification buildSystem() {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent po = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        b.setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title.length() == 0 ? "Aurora Music" : title)
                .setContentText(artist)
                .setContentIntent(po)
                .setOngoing(playing)
                .setShowWhen(false)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(action(android.R.drawable.ic_media_previous, "Anterior", "prev", 1))
                .addAction(action(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Pausa" : "Reproducir", "toggle", 2))
                .addAction(action(android.R.drawable.ic_media_next, "Siguiente", "next", 3))
                .setStyle(new Notification.MediaStyle()
                        .setMediaSession(session.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));
        Bitmap meta = ("skin".equals(mode) && art != null) ? art : (cover != null ? cover : art);
        if (meta != null) b.setLargeIcon(meta);
        return b.build();
    }

    // ---------- Notificacion con el diseno del reproductor elegido ----------
    Notification buildSkin() {
        SkinUi ui = new SkinUi(this, playing, title, artist, skin, dur, pos, acc, dcol, cover);
        ui.dpng = dpng;
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent po = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        b.setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(artist)
                .setContentIntent(po)
                .setOngoing(true)
                .setShowWhen(false)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_SECRET)
                .setStyle(new Notification.DecoratedCustomViewStyle())
                .setCustomContentView(ui.small(false))
                .setCustomBigContentView(ui.big(false));
        return b.build();
    }

    @Override
    public void onDestroy() {
        try {
            nm.cancel(SKIN_ID);
        } catch (Throwable ignored) {
        }
        if (wl != null && wl.isHeld()) wl.release();
        lostTransient = false;
        playing = false;
        syncFocus();
        if (hasFocus) dropFocus();
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        if (inst == this) inst = null;
        foreground = false;
        try {
            SkinUi.markPaused(this);
            AuroraWidget.refresh(this);
        } catch (Throwable ignored) {
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

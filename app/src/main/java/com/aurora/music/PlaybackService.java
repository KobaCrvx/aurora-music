package com.aurora.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Servicio en primer plano: mantiene viva la app con la pantalla apagada o en segundo plano
 * y muestra la notificacion con anterior / pausa / siguiente.
 */
public class PlaybackService extends Service {
    static final String CH = "aurora_playback";
    static final int ID = 7;

    static PlaybackService inst;

    NotificationManager nm;
    PowerManager.WakeLock wl;
    boolean foreground = false;
    boolean playing = false;
    String title = "";
    String artist = "";

    static void push(Context c, boolean playing, String title, String artist) {
        if (title == null || title.length() == 0) {
            stopNow(c);
            return;
        }
        if (inst != null) {
            inst.update(playing, title, artist);
            return;
        }
        Intent i = new Intent(c, PlaybackService.class);
        i.putExtra("playing", playing);
        i.putExtra("title", title);
        i.putExtra("artist", artist);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        } catch (Exception ignored) {
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
        update(intent.getBooleanExtra("playing", false), intent.getStringExtra("title"), intent.getStringExtra("artist"));
        return START_NOT_STICKY;
    }

    void update(boolean playing, String title, String artist) {
        this.playing = playing;
        this.title = title == null ? "" : title;
        this.artist = artist == null ? "" : artist;
        Notification n = build();
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
        if (playing) {
            if (!wl.isHeld()) wl.acquire(10 * 60 * 60 * 1000L);
        } else if (wl.isHeld()) {
            wl.release();
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

    Notification build() {
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
                .setStyle(new Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }

    @Override
    public void onDestroy() {
        if (wl != null && wl.isHeld()) wl.release();
        if (inst == this) inst = null;
        foreground = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

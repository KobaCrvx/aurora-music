package com.aurora.music;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Widget de la pantalla de inicio: se ve como el reproductor que estes usando. */
public class AuroraWidget extends AppWidgetProvider {
    static final String ACTION = "com.aurora.music.WIDGET_CMD";

    @Override
    public void onReceive(Context c, Intent i) {
        if (ACTION.equals(i.getAction())) {
            String cmd = i.getStringExtra("c");
            if (cmd != null && MainActivity.inst != null) MainActivity.command(cmd);
            return;
        }
        super.onReceive(c, i);
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        refresh(c);
    }

    static void refresh(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, AuroraWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = SkinUi.load(c).big(true);
            Intent open = new Intent(c, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            v.setOnClickPendingIntent(R.id.n_title, PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            v.setOnClickPendingIntent(R.id.n_artist, PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            m.updateAppWidget(ids, v);
        } catch (Throwable ignored) {
        }
    }
}

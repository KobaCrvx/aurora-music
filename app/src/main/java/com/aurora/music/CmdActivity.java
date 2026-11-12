package com.aurora.music;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/** Puente invisible para los botones del widget: manda la orden a la app, o la abre si estaba cerrada. */
public class CmdActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        String c = getIntent().getStringExtra("c");
        if (MainActivity.inst == null) {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } else if (c != null) {
            MainActivity.command(c);
        }
        finish();
        overridePendingTransition(0, 0);
    }
}

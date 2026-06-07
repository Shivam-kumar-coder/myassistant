package com.aistudio.myassistant

import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.content.Intent
import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.BorderStroke

data class ChatMessage(
    val id: Long = System.currentTimeMillis(),
    val role: String,
    val text: String,
    val bitmap: Bitmap? = null
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                HomeScreen()
            }
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else true
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        }
    }

    @Composable
    fun HomeScreen() {
        val context = LocalContext.current
        var isServiceRunning by remember { mutableStateOf(false) }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFAFAFA)),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 48.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFFBC02D),
                        modifier = Modifier.size(80.dp),
                        shadowElevation = 4.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.SmartToy, contentDescription = null, modifier = Modifier.size(40.dp))
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "My Assistant",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.Black
                    )
                    Text(
                        "Your Personal Digital Guide",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            // Control Buttons
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Button(
                    onClick = {
                        if (checkOverlayPermission()) {
                            val intent = Intent(context, AssistantService::class.java)
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                context.startForegroundService(intent)
                            } else {
                                context.startService(intent)
                            }
                            isServiceRunning = true
                        } else {
                            requestOverlayPermission()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isServiceRunning) Color(0xFFE8F5E9) else Color(0xFF4CAF50)
                    )
                ) {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = if (isServiceRunning) Color(0xFF2E7D32) else Color.White
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Start Assistant",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = if (isServiceRunning) Color(0xFF2E7D32) else Color.White
                    )
                }

                Button(
                    onClick = {
                        context.stopService(Intent(context, AssistantService::class.java))
                        isServiceRunning = false
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFFEBEE)
                    )
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null, tint = Color(0xFFC62828))
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Stop Assistant",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = Color(0xFFC62828)
                    )
                }
            }

            Spacer(Modifier.weight(0.5f))

            // AdMob Banner Placeholder
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                color = Color(0xFFEEEEEE),
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, Color.LightGray)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        "GOOGLE ADMOB BANNER AD",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}


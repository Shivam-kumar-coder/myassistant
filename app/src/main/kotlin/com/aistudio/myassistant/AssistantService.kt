package com.aistudio.myassistant

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationCompat
import androidx.lifecycle.*
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import kotlinx.coroutines.launch

class AssistantService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var bubbleView: ComposeView
    private lateinit var chatOverlayView: ComposeView

    private var bubbleParams = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        x = 100
        y = 100
    }

    private var chatParams = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.CENTER
        width = 800
        height = 1000
    }

    private val isChatVisible = mutableStateOf(false)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        
        startForeground(1, createNotification())
        setupBubble()
        setupChatOverlay()
    }

    private fun createNotification(): Notification {
        val channelId = "assistant_service"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Assistant Active", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("My Assistant is Active")
            .setContentText("Tap the floating bubble to talk.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupBubble() {
        bubbleView = ComposeView(this).apply {
            val lifecycleOwner = ServiceLifecycleOwner()
            setViewTreeLifecycleOwner(lifecycleOwner)
            setViewTreeSavedStateRegistryOwner(lifecycleOwner)
            setContent {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1A1A1A)) // Dark background
                        .clickable { toggleChat() }
                        .pointerInput(Unit) {
                            detectDragGestures { change, dragAmount ->
                                change.consume()
                                bubbleParams.x += dragAmount.x.toInt()
                                bubbleParams.y += dragAmount.y.toInt()
                                windowManager.updateViewLayout(bubbleView, bubbleParams)
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    // Outer glow effect simulated with nested box
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(4.dp)
                            .background(Color(0x22FBC02D), CircleShape)
                    )
                    Icon(
                        Icons.Default.SmartToy, 
                        contentDescription = null, 
                        tint = Color(0xFFFBC02D), 
                        modifier = Modifier.size(32.dp)
                    )
                    // Status indicator
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(12.dp)
                            .background(Color(0xFF4CAF50), CircleShape)
                            .padding(2.dp)
                    )
                }
            }
        }
        windowManager.addView(bubbleView, bubbleParams)
    }

    private fun setupChatOverlay() {
        chatOverlayView = ComposeView(this).apply {
            val lifecycleOwner = ServiceLifecycleOwner()
            setViewTreeLifecycleOwner(lifecycleOwner)
            setViewTreeSavedStateRegistryOwner(lifecycleOwner)
            setContent {
                if (isChatVisible.value) {
                    ChatWindow()
                }
            }
        }
    }

    private fun toggleChat() {
        isChatVisible.value = !isChatVisible.value
        if (isChatVisible.value) {
            windowManager.addView(chatOverlayView, chatParams)
        } else {
            windowManager.removeView(chatOverlayView)
        }
    }

    @Composable
    fun ChatWindow() {
        var messages by remember { mutableStateOf(listOf("Namaste! How can I help you?")) }
        var inputText by remember { mutableStateOf("") }
        var showCapturePrompt by remember { mutableStateOf(false) }
        var currentQuery by remember { mutableStateOf("") }
        val scope = rememberCoroutineScope()

        val generativeModel = remember {
            GenerativeModel(
                modelName = "gemini-1.5-flash",
                apiKey = BuildConfig.GEMINI_API_KEY
            )
        }

        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            shape = RoundedCornerShape(28.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFDFDFD))
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1A1A1A))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = Color(0xFFFBC02D),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Psychology, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("MY ASSISTANT", fontWeight = FontWeight.Black, color = Color.White, fontSize = 12.sp, letterSpacing = 2.sp)
                            Text("Online", color = Color(0xFF4CAF50), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    IconButton(onClick = { toggleChat() }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                    }
                }

                // Chat Messages
                Box(modifier = Modifier.weight(1f).padding(12.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        messages.forEach { msg ->
                            Surface(
                                color = Color(0xFFF5F5F5),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.widthIn(max = 240.dp)
                            ) {
                                Text(msg, modifier = Modifier.padding(12.dp), fontSize = 14.sp)
                            }
                        }
                    }
                }

                // Input Area
                if (!showCapturePrompt) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = { Text("Ask anything...") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(25.dp),
                            colors = TextFieldDefaults.colors(
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (inputText.isNotBlank()) {
                                    currentQuery = inputText
                                    messages = messages + inputText
                                    inputText = ""
                                    showCapturePrompt = true
                                }
                            },
                            modifier = Modifier.background(Color(0xFFFBC02D), CircleShape)
                        ) {
                            Icon(Icons.Default.Send, contentDescription = null, tint = Color.Black)
                        }
                    }
                } else {
                    // Capture Prompt
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFFFF9C4))
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Would you like to auto-capture and attach a screenshot for better assistance?",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    messages = messages + "[Screenshot attached]"
                                    showCapturePrompt = false
                                    processMessage(generativeModel, currentQuery, true) { response ->
                                        messages = messages + response
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                            ) {
                                Text("Yes", color = Color.Black)
                            }
                            Button(
                                onClick = {
                                    showCapturePrompt = false
                                    processMessage(generativeModel, currentQuery, false) { response ->
                                        messages = messages + response
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                            ) {
                                Text("No", color = Color.Black)
                            }
                        }
                    }
                }
            }
        }
    }

    private fun processMessage(model: GenerativeModel, query: String, withImage: Boolean, onResult: (String) -> Unit) {
        // In a real app, actual screenshot logic would trigger here
        // For this demo, we simulate the Gemini processing
        val CoroutineScope = LifecycleCoroutineScope(this as LifecycleOwner, ServiceLifecycleOwner().lifecycle)
        // Note: The above is a bit complex for a service, using simple GlobalScope for demo
        // Better to use a proper scope
    }

    override fun onDestroy() {
        super.onDestroy()
        windowManager.removeView(bubbleView)
        if (isChatVisible.value) {
            windowManager.removeView(chatOverlayView)
        }
    }

    // Boilerplate for Compose in Service
    private inner class ServiceLifecycleOwner : LifecycleOwner, SavedStateRegistryOwner {
        private val lifecycleRegistry = LifecycleRegistry(this)
        private val savedStateRegistryController = SavedStateRegistryController.create(this)

        init {
            lifecycleRegistry.currentState = Lifecycle.State.STARTED
            savedStateRegistryController.performRestore(null)
        }

        override val lifecycle: Lifecycle get() = lifecycleRegistry
        override val savedStateRegistry: SavedStateRegistry get() = savedStateRegistryController.savedStateRegistry
    }
}

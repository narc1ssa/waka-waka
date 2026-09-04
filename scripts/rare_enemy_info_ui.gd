extends CanvasLayer

@onready var info_panel: Panel = $InfoPanel
@onready var close_button: TextureButton = $InfoPanel/CloseButton
@onready var info_image: TextureRect = $InfoPanel/InfoImage
@onready var info_text: Label = $InfoPanel/InfoText

var auto_close_timer: Timer
var is_visible := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	
	add_to_group("rare_info_ui")  # <- ДОБАВЬ ЭТУ СТРОКУ!
	
	info_panel.visible = false
	
	close_button.pressed.connect(_on_close)
	
	# Таймер автозакрытия
	auto_close_timer = Timer.new()
	auto_close_timer.wait_time = 30.0
	auto_close_timer.one_shot = true
	auto_close_timer.timeout.connect(_on_close)
	add_child(auto_close_timer)


func show_info(text: String, reward: int) -> void:
	print("📺 show_info вызван! text = ", text, ", reward = ", reward)
	
	info_text.text = "%s\n+%d котов!" % [text, reward]
	
	info_panel.visible = true
	is_visible = true
	
	get_tree().paused = true
	
	print("📺 info_panel.visible = ", info_panel.visible)


func _on_close() -> void:
	if not is_visible:
		return
	
	info_panel.visible = false
	is_visible = false
	
	get_tree().paused = false
	auto_close_timer.stop()

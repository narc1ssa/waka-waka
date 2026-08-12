extends Area2D


func _ready() -> void:
	add_to_group("enemy")

	# Враг сам ничего не отслеживает на этой стадии.
	# Его будет обнаруживать EatArea игрока.
	monitoring = false
	monitorable = true


func eat() -> void:
	queue_free()

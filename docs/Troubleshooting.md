# Troubleshooting

Common issues and quick fixes.

## Gamepad controls are not detected

If gamepad input isn't detected, ensure your kernel and udev rules are configured to allow joystick devices. On Linux, add your user to the `input` or `games` group as appropriate, then re-plug the controller.

## Steam Deck controls are not detected

On SteamOS / Steam Deck, ensure the Proton/Steam overlay isn't blocking input. You may need to run the wrapper with environment variables that forward gamepad input correctly.

If you encounter other issues, open an issue with diagnostic logs and steps to reproduce.

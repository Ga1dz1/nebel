import asyncio

from nebel_control.calibration import (
    begin_session,
    controller_state,
    end_session,
    reset_calibration_params,
    save_calibration,
)
from nebel_control.config import build_config
from nebel_control.controller import set_controller_type
from nebel_control.deps import get_status as deps_status, install_verbs as deps_install
from nebel_control.display import display_state, restart_gamescope_session, set_display_config, set_internal_touchpad
from nebel_control.filepick import heroic_games, heroic_launch, heroic_match, list_dir
from nebel_control.lighting import (
    set_stick_led_charging_indicator,
    set_stick_led_chase,
    set_stick_led_color,
    set_stick_led_color_source,
    set_stick_led_compass,
    set_stick_led_duotone_color,
    set_stick_led_duotone_orientation,
    set_stick_led_enabled,
    set_stick_led_flash_color,
    set_stick_led_max_brightness,
    set_stick_led_mode,
    set_stick_led_notify,
    set_stick_led_notify_color,
    set_stick_led_param,
    set_stick_led_screen_link,
    set_stick_led_seesaw,
    set_stick_led_flip,
)
from nebel_control.monitor import set_overlay_enabled, system_monitor
from nebel_control.power import save_power_config
from nebel_control.shared_storage import set_shared_storage_enabled
from nebel_control.steam import installed_games
from nebel_control.sync import (
    accept_pending_folder,
    add_custom_folder,
    add_device,
    discovered_devices,
    dismiss_pending_device,
    dismiss_pending_folder,
    remove_custom_folder,
    remove_device,
    set_folder_enabled,
    set_service_enabled,
    sync_state,
)
from nebel_control.system import set_ssh_enabled
from nebel_control.tweaks import load_compat_applied, save_compat_applied, save_tweaks


class Plugin:
    # Offload blocking work to a thread so a slow call can't stall Decky's asyncio loop.
    async def get_config(self):
        return await asyncio.to_thread(build_config, False)

    async def get_installed_games(self):
        return await asyncio.to_thread(installed_games)

    async def save_power_config(self, data):
        await asyncio.to_thread(save_power_config, data)
        return await self.get_config()

    async def save_tweaks(self, data):
        await asyncio.to_thread(save_tweaks, data)
        return await self.get_config()

    async def get_compat_applied(self):
        return await asyncio.to_thread(load_compat_applied)

    async def save_compat_applied(self, appids):
        return await asyncio.to_thread(save_compat_applied, appids)

    async def set_ssh_enabled(self, enabled):
        return await asyncio.to_thread(set_ssh_enabled, enabled)

    async def set_controller_type(self, value):
        return await asyncio.to_thread(set_controller_type, value)

    async def set_shared_storage_enabled(self, enabled):
        return await asyncio.to_thread(set_shared_storage_enabled, enabled)

    async def list_dir(self, path):
        return await asyncio.to_thread(list_dir, path)

    async def heroic_games(self):
        return await asyncio.to_thread(heroic_games)

    async def heroic_launch(self, game):
        return heroic_launch(game)

    async def heroic_match(self, path):
        return await asyncio.to_thread(heroic_match, path)

    async def deps_status(self, appid):
        return await asyncio.to_thread(deps_status, appid)

    async def deps_install(self, appid, verbs):
        # Returns immediately with the current state; the winetricks worker
        # runs in a thread and the frontend polls deps_status for progress.
        try:
            return await asyncio.to_thread(deps_install, appid, verbs)
        except (RuntimeError, ValueError) as exc:
            return {**await asyncio.to_thread(deps_status, appid), "error": str(exc)}

    async def get_sync_state(self):
        return await asyncio.to_thread(sync_state)

    async def set_sync_service_enabled(self, enabled):
        return await asyncio.to_thread(set_service_enabled, enabled)

    async def sync_add_device(self, device_id, name):
        return await asyncio.to_thread(add_device, device_id, name)

    async def sync_discovered_devices(self):
        return await asyncio.to_thread(discovered_devices)

    async def sync_remove_device(self, device_id):
        return await asyncio.to_thread(remove_device, device_id)

    async def sync_set_folder_enabled(self, preset_id, enabled):
        return await asyncio.to_thread(set_folder_enabled, preset_id, enabled)

    async def sync_add_custom_folder(self, path, label):
        return await asyncio.to_thread(add_custom_folder, path, label)

    async def sync_remove_custom_folder(self, folder_id):
        return await asyncio.to_thread(remove_custom_folder, folder_id)

    async def sync_dismiss_device(self, device_id):
        return await asyncio.to_thread(dismiss_pending_device, device_id)

    async def sync_accept_folder(self, folder_id):
        return await asyncio.to_thread(accept_pending_folder, folder_id)

    async def sync_dismiss_folder(self, folder_id, device_id):
        return await asyncio.to_thread(dismiss_pending_folder, folder_id, device_id)

    async def set_stick_led_color(self, side, value):
        return await asyncio.to_thread(set_stick_led_color, side, value)

    async def set_stick_led_mode(self, side, mode):
        return await asyncio.to_thread(set_stick_led_mode, side, mode)

    async def set_stick_led_screen_link(self, enabled):
        return await asyncio.to_thread(set_stick_led_screen_link, enabled)

    async def set_stick_led_param(self, side, param, mode, value):
        return await asyncio.to_thread(set_stick_led_param, side, param, mode, value)

    async def set_stick_led_flash_color(self, button, value):
        return await asyncio.to_thread(set_stick_led_flash_color, button, value)

    async def set_stick_led_duotone_color(self, side, slot, value):
        return await asyncio.to_thread(set_stick_led_duotone_color, side, slot, value)

    async def set_stick_led_duotone_orientation(self, side, orientation):
        return await asyncio.to_thread(set_stick_led_duotone_orientation, side, orientation)

    async def set_stick_led_color_source(self, side, source):
        return await asyncio.to_thread(set_stick_led_color_source, side, source)

    async def set_stick_led_charging_indicator(self, side, enabled):
        return await asyncio.to_thread(set_stick_led_charging_indicator, side, enabled)

    async def set_stick_led_chase(self, side, enabled):
        return await asyncio.to_thread(set_stick_led_chase, side, enabled)

    async def set_stick_led_compass(self, side, enabled):
        return await asyncio.to_thread(set_stick_led_compass, side, enabled)

    async def set_stick_led_seesaw(self, side, enabled):
        return await asyncio.to_thread(set_stick_led_seesaw, side, enabled)

    async def set_stick_led_flip(self, side, enabled):
        return await asyncio.to_thread(set_stick_led_flip, side, enabled)

    async def set_stick_led_enabled(self, enabled):
        return await asyncio.to_thread(set_stick_led_enabled, enabled)

    async def set_stick_led_max_brightness(self, value):
        return await asyncio.to_thread(set_stick_led_max_brightness, value)

    async def get_display_state(self):
        return await asyncio.to_thread(display_state)

    async def set_display_config(self, use_external, connector, width, height, orientation):
        return await asyncio.to_thread(set_display_config, use_external, connector, width, height, orientation)

    async def restart_gamescope_session(self):
        return await asyncio.to_thread(restart_gamescope_session)

    async def set_internal_touchpad(self, enabled):
        return await asyncio.to_thread(set_internal_touchpad, enabled)

    async def set_stick_led_notify(self, enabled):
        return await asyncio.to_thread(set_stick_led_notify, enabled)

    async def set_stick_led_notify_color(self, value):
        return await asyncio.to_thread(set_stick_led_notify_color, value)

    async def get_system_monitor(self):
        return await asyncio.to_thread(system_monitor)

    async def set_overlay_enabled(self, enabled):
        return await asyncio.to_thread(set_overlay_enabled, enabled)

    async def get_controller_state(self):
        return await asyncio.to_thread(controller_state)

    async def save_calibration(self, capture):
        return await asyncio.to_thread(save_calibration, capture)

    async def reset_calibration(self):
        return await asyncio.to_thread(reset_calibration_params)

    async def begin_calibration_session(self, token=None):
        return await asyncio.to_thread(begin_session, token)

    async def end_calibration_session(self, token=None):
        return await asyncio.to_thread(end_session, token)

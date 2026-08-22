gamescope.config.known_displays.retroid_pocket_6 = {
    pretty_name = "Retroid Pocket 6 (Visionox VTDR6130)",
    dynamic_refresh_rates = {
        60, 120
    },
    hdr = {
        supported = false,
        force_enabled = false,
        eotf = gamescope.eotf.gamma22,
        max_content_light_level = 500,
        max_frame_average_luminance = 500,
        min_content_light_level = 0.5
    },
    dynamic_modegen = function(base_mode, refresh)
        debug("Generating mode "..refresh.."Hz for Retroid Pocket 6")
        local mode = base_mode

        gamescope.modegen.set_resolution(mode, 1080, 1920)

        -- Horizontal timings: Hfront, Hsync, Hback
        -- Match the Android reference / kernel panel driver.
        gamescope.modegen.set_h_timings(mode, 22, 2, 16)
        -- Vertical timings: Vfront, Vsync, Vback
        if refresh == 60 then
            gamescope.modegen.set_v_timings(mode, 1972, 4, 16)
        elseif refresh == 120 then
            gamescope.modegen.set_v_timings(mode, 16, 4, 20)
        else
            -- Fallback for intermediate rates: keep 120Hz porches and scale clock
            gamescope.modegen.set_v_timings(mode, 16, 4, 20)
        end

        mode.clock = gamescope.modegen.calc_max_clock(mode, refresh)
        mode.vrefresh = gamescope.modegen.calc_vrefresh(mode)

        return mode
    end,
    matches = function(display)
        -- RP6 internal DSI panel has no physical EDID; match by connector/device.
        if display.connector == "DSI-1" and
           display.device_id == "retroid-pocket-6" and
           display.internal and
           not display.has_edid then
            debug("[retroid_pocket_6] Matched EDID-less internal DSI panel")
            return 6000
        end
        return -1
    end
}
debug("Registered Retroid Pocket 6 as a known display")

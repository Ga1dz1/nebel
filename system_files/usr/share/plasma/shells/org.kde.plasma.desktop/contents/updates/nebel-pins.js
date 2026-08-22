const allPanels = panels();

for (let i = 0; i < allPanels.length; ++i) {
    const widgets = allPanels[i].widgets();

    for (let j = 0; j < widgets.length; ++j) {
        const widget = widgets[j];

        if (widget.type === "org.kde.plasma.icontasks") {
            widget.currentConfigGroup = ["General"];

            const currentLaunchers = widget.readConfig("launchers", "");
            if (!currentLaunchers || currentLaunchers.trim() === "") {
                widget.writeConfig("launchers", [
                    "applications:org.mozilla.firefox.desktop",
                    "applications:steam.desktop",
                    "applications:io.github.kolunmi.Bazaar.desktop",
                    "applications:org.kde.konsole.desktop",
                    "applications:org.kde.dolphin.desktop"
                ]);
                widget.reloadConfig();
            }
        }
    }
}

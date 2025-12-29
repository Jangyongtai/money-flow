{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
  ];
  idx = {
    extensions = [
      "bradlc.vscode-tailwindcss"
      "dsznajder.es7-react-js-snippets"
      "esbenp.prettier-vscode"
    ];
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "--prefix" "frontend" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0" ];
          manager = "web";
        };
      };
    };
    workspace = {
      onCreate = {
        npm-install = "npm --prefix frontend install";
      };
      onStart = {
        # Optional: run something on every start
      };
    };
  };
}

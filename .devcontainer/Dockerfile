FROM python:3.9-bullseye

RUN apt-get update \
    && apt-get install -y apt-transport-https ca-certificates wget curl \
                          gnupg2 software-properties-common less vim graphviz \
                          libgbm-dev libasound2 xvfb
RUN curl -s https://api.github.com/repos/jgraph/drawio-desktop/releases/latest \
    | grep browser_download_url | grep '\.deb' | cut -d '"' -f 4 | wget -i - \
    && apt -f install -y ./drawio-amd64-*.deb \
    && rm -f ./drawio-amd64-*.deb

COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create a non-root user - see https://aka.ms/vscode-remote/containers/non-root-user.
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && mkdir -p /home/$USERNAME/.local/bin \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME/.local \
    && echo "PATH='/home/$USERNAME/.local/bin:$PATH'" >> home/$USERNAME/.bashrc

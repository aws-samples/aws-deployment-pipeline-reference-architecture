FROM python:3.9-bullseye

RUN apt-get update \
    && apt-get install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common sudo less vim graphviz

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create a non-root user - see https://aka.ms/vscode-remote/containers/non-root-user.
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && mkdir -p /home/$USERNAME/.local/bin \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME/.local \
    && echo "PATH='/home/$USERNAME/.local/bin:$PATH'" >> home/$USERNAME/.bashrc \
    #
    ## Add sudo support for the non-root user
    #
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME
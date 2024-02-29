# 🏠 Home kubernetes cluster using talos linux backed by flux CD
The base cluster configs are derived from [onedr0p cluster template](https://github.com/onedr0p/cluster-template) and then customized with my modifications and additons to work with my home infrastructure and needs.

## ✨ Features

This cluster is based on [talos linux](https://talos.dev) with the configurations managed through git and applied through flux CD. This cluster includes external-dns that is used to update external and internal DNS and ingress-nginx for SSL with [Cloudflare](https://www.cloudflare.com/). [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) is also included to provide external access to certain applications deployed in your cluster. Postgres database is deployed using cloudnative-pg and Redis compatible database (dragonflydb) is deployed using dragonfly-operator.

- **Components:** [ingress-nginx](https://github.com/kubernetes/ingress-nginx/), [external-dns](https://github.com/kubernetes-sigs/external-dns) and [cloudflared](https://github.com/cloudflare/cloudflared), [flux](https://github.com/fluxcd/flux2), [cert-manager](https://github.com/cert-manager/cert-manager), [spegel](https://github.com/XenitAB/spegel), [reloader](https://github.com/stakater/Reloader), [system-upgrade-controller](https://github.com/rancher/system-upgrade-controller), [openebs](https://github.com/openebs/openebs) and
 [cilium](https://github.com/cilium/cilium), [rook-ceph](https://github.com/rook/rook), [cloudnative-pg](https://github.com/cloudnative-pg/cloudnative-pg).

**Other features include:**

[Renovate](https://www.mend.io/renovate) is a tool that automates dependency management. It is designed to scan your repository around the clock and open PRs for out-of-date dependencies it finds. Common dependencies it can discover are Helm charts, container images, GitHub Actions, Ansible roles... even Flux itself!

Merging a PR will cause Flux to apply the update to your cluster.

The base Renovate configuration in your repository can be viewed at [.github/renovate.json5](./.github/renovate.json5). 

[GitHub Actions](https://github.com/features/actions) with helpful workflows.

### System requirements

> **Note:** All nodes are able to run workloads, **including** the controller nodes. No workers are deployed in my cluster at the moment. All nodes are deployed on vSphere 8.0.

### Talos

1. I started with [talos linux vmware deploy script](https://raw.githubusercontent.com/siderolabs/talos/master/website/content/v1.6/talos-guides/install/virtualized-platforms/vmware/vmware.sh) and customized it to deploy the VMs required using the configuration files generated in steps below. GOVC will need to installed on the system prior to this step. I chose to deploy 5 control plane VMs with 8c/32G/500G(System)/300G(Ceph/Rook).

2. Continue on to 🚀 [**Getting Started**](#-getting-started)

## 🚀 Getting Started (Notes for future me)

### 🌱 Stage 1: Setup your local workstation

Dev Container is used to run the environment that has all the necessary tools.

- `devcontainer` requires Docker and VSCode installed.

1. Start Docker and open the repository in VSCode. There will be a pop-up asking you to use the `devcontainer`, click the button to start using it.

### ⛵ Stage 2: Install Kubernetes

#### Talos

1. Create talos secrets

    ```sh
    task talos:bootstrap-gensecret
    task talos:bootstrap-genconfig
    ```

2. Deploy talos VM with the configs generated from step 1.

    ```sh
    ./vmware.sh upload_ova
    ./vmware.sh create
    ```

3. Boostrap talos and get kubeconfig

    ```sh
    task talos:bootstrap-install
    task talos:fetch-kubeconfig
    ```

4. Install cilium and kubelet-csr-approver into the cluster

    ```sh
    task talos:bootstrap-apps
    ```
5. Apply GPU patch to the GPU node/s.
    ```sh
    cd kubernetes/talos/clusterconfig
    talosctl -n <node-ip> patch mc --patch @gpu-patch.yaml
    ```

6. Upgrade talos to the correct schematic generated from [talos](https://factory.talos.dev) since the OVA doesn't include any required extensions for this repo; GPU node has a different schematic ID compared to regular node due to added modules/extensions siderolabs/nonfree-kmod-nvidia and siderolabs/nvidia-container-toolkit.
    ```sh
    talosctl -n <node-ip> upgrade --image factory.talos.dev/installer/<schematic-id>:<talos-ver>
    ```
🩹**Note:** I applied the upgrade to GPU node/s with GPU specific schematic ID and also to regular nodes with regular schematic ID with just intel-ucode and iscsi extension.

7. Verify NVIDIA kernel modules and extensions are loaded
    ```sh
    talosctl -n <node-ip> read /proc/modules

    #nvidia_uvm 1146880 - - Live 0xffffffffc2733000 (PO)
    #nvidia_drm 69632 - - Live 0xffffffffc2721000 (PO)
    #nvidia_modeset 1142784 - - Live 0xffffffffc25ea000 (PO)
    #nvidia 39047168 - - Live 0xffffffffc00ac000 (PO)
    ```

    ```sh
    talosctl -n <node-ip> get extensions

    #NODE NAMESPACE TYPE ID VERSION NAME VERSION

    #172.31.41.27 runtime ExtensionStatus 000.ghcr.io-frezbo-nvidia-container-toolkit-510.60.02-v1.9.0 nvidia-container-toolkit 510.02-v1
    ```

    ```sh
    talosctl -n <node-ip> read /proc/driver/nvidia/version

    #NVRM version: NVIDIA UNIX x86_64 Kernel Module  510.60.02  Wed Mar 16 11:24:05 UTC 2022
    #GCC version:  gcc version 11.2.0 (GCC)
    ```
8. Create nvidia runtime class
    ```sh
    kubectl apply -f nvidia-runtime.yaml
     ```

### 🛰️ Stage 3: Install vmware tools

#### Talos vmtools daemonset
1. Create secret for vmtools daemonset

    ```sh
    # create new talos API credentials
    talosctl -n <cp-node-ip> config new vmtoolsd-secret.yaml --roles os:admin

    # import API credentials into K8s
    kubectl -n kube-system create secret generic talos-vmtoolsd-config --from-file=talosconfig=./vmtoolsd-secret.yaml

    # delete temporary credentials file
    rm vmtoolsd-secret.yaml
    ```
2. Install vmtools daemonset from manifest

    ```sh
    kubectl apply -f https://raw.githubusercontent.com/siderolabs/talos-vmtoolsd/master/deploy/latest.yaml
    ```

### 🏗️ Stage 4: Install flux in the cluster

1. Verify flux can be installed

    ```sh
    flux check --pre
    # ► checking prerequisites
    # ✔ kubectl 1.27.3 >=1.18.0-0
    # ✔ Kubernetes 1.27.3+k3s1 >=1.16.0-0
    # ✔ prerequisites checks passed
    ```

2. Install flux and sync the cluster to the Git repository

    ```sh
    task flux:bootstrap
    # namespace/flux-system configured
    # customresourcedefinition.apiextensions.k8s.io/alerts.notification.toolkit.fluxcd.io created
    # ...
    ```

1. Verify flux components are running in the cluster

    ```sh
    kubectl -n flux-system get pods -o wide
    # NAME                                       READY   STATUS    RESTARTS   AGE
    # helm-controller-5bbd94c75-89sb4            1/1     Running   0          1h
    # kustomize-controller-7b67b6b77d-nqc67      1/1     Running   0          1h
    # notification-controller-7c46575844-k4bvr   1/1     Running   0          1h
    # source-controller-7d6875bcb4-zqw9f         1/1     Running   0          1h
    ```

## 📣 Flux w/ Cloudflare post installation

#### 🌐 DNS

The `external-dns` application created in the `network` namespace will handle creating public DNS records and Private DNS records.

#### 📜 Certificates

Cert-Manager is configured with Cloudflare for DNS validation and the ACME certs are issued by Google Public CA (GTS - Google Trust Services) that is attached to a gCloud project. LetsEnrypt is also defined as a cluster issuer just as a backup.

#### 🪝 Github Webhook

By default flux will periodically check your git repository for changes. In order to have Flux reconcile on `git push` Github should be configured to send `push` events to Flux.

1. Obtain the webhook path

    📍 _Hook id and path should look like `/hook/12ebd1e363c641dc3c2e430ecf3cee2b3c7a5ac9e1234506f6f5f3ce1230e123`_

    ```sh
    kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}'
    ```

2. Piece together the full URL with the webhook path appended

    ```text
    https://flux-webhook.${bootstrap_cloudflare_domain}/hook/12ebd1e363c641dc3c2e430ecf3cee2b3c7a5ac9e1234506f6f5f3ce1230e123
    ```

3. Navigate to the settings of your repository on Github, under "Settings/Webhooks" press the "Add webhook" button. Fill in the webhook url and `bootstrap_flux_github_webhook_token` secret and save.

## 💥 Nuke

There might be a situation which necessiates starting from scratch. This will completely destroy cluster and the VMs. This cluster's databases and volumes are synchronized to s3 based repos and can be bootstrapped from those backups to restore state.

```sh
# Nuke cluster
./vmware.sh destroy
```

## 🙌 Related Projects

Inspiration for my repo came from these repos below and the opensource community.

- [onedr0p/home-ops](https://github.com/onedr0p/home-ops) - _This is a mono repository for my home infrastructure and Kubernetes cluster. I try to adhere to Infrastructure as Code (IaC) and GitOps practices using tools like Ansible, Terraform, Kubernetes, Flux, Renovate, and GitHub Actions._
- [bjw-s/home-ops](https://github.com/bjw-s/home-ops) - _👋 Welcome to my Home Operations repository. This is a mono repository for my home infrastructure and Kubernetes cluster. I try to adhere to Infrastructure as Code (IaC) and GitOps practices using the tools like Ansible, Terraform, Kubernetes, Flux, Renovate and GitHub Actions._


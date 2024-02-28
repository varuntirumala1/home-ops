#Once the pod is up, it wasnt allowing to go through the setup wizard using the LB ip.
So did this instead
kubectl -n media port-forward services/plex 32400:32400

#this will create a portforward for that service on the bastion where you usually connect and run kubectl commands for deployments

Then setup a SSH tunnel from your local machine to bastion if both devices are different

ssh -L 8888:127.0.0.1:32400 user@bastion-ip

#then go to a webbrowser on your local machine and go to http://127.0.0.1:8888/web to finish setup

#!/bin/bash

sudo apt update && sudo apt upgrade && sudo apt autoremove

## Install Python3

sudo apt install python3 -y

## install with apt

sed -n '/##apt/,/##end/p' to_install.txt | sed '1d;$d' | xargs sudo apt install -y

## install with npm

#sudo npm install -g $(sed -n '/##npm/,/##fin/p' to_install.txt | sed '1d;$d')

## install with pip

read -p "Enter the path to the virtual environment (or press Enter to create a new one): " venv_path

if [ -z "$venv_path" ]; then
	venv_path="./venv"
	python3 -m venv "$venv_path"
	echo "Created a new virtual environment at $venv_path"
else
	if [ ! -d "$venv_path" ]; then
		echo "The specified path does not exist. Creating a new virtual environment at $venv_path"
		python3 -m venv "$venv_path"
	else
		echo "Using existing virtual environment at $venv_path"
	fi
fi

source "$venv_path/bin/activate"

## install with pip
pip install -r requirements.txt

## install with npm

#npm install lucide-react
#npm install react-router-dom

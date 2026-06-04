pipeline {
    agent any

    environment {
        IMAGE_NAME = 'task-manager'
        BUILD_TAG = "task-manager:${BUILD_NUMBER}"
    }

    stages {

        stage('Build') {
            steps {
                echo "Building project: ${BUILD_TAG}"
                bat 'npm install'
                bat 'docker build -t task-manager:latest .'
                echo "Docker image built successfully"
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('Code Quality') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    bat '''
                        sonar-scanner ^
                          -Dsonar.projectKey=task-manager ^
                          -Dsonar.sources=src ^
                          -Dsonar.tests=tests ^
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    waitForQualityGate abortPip
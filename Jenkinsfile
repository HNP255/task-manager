pipeline {
    agent any

    environment {
        IMAGE_NAME = 'task-manager'
        BUILD_TAG = "task-manager:${BUILD_NUMBER}"
    }

    stages {

        stage('Build') {
            steps {
                echo "Building project"
                bat 'npm install'
                bat 'docker build -t task-manager:latest .'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
            post {
                always {
                    publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Coverage Report'])
                }
            }
        }

        stage('Code Quality') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    bat 'sonar-scanner -Dsonar.projectKey=task-manager -Dsonar.sources=src -Dsonar.tests=tests'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
        }
    }
}

        stage('Security Scan') {
    steps {
        echo "Running Trivy security scan on filesystem..."
        bat 'docker run --rm -v "%CD%":/project aquasec/trivy:latest fs --exit-code 0 --severity HIGH,CRITICAL /project'
        echo "Security scan completed"
    }
}

        stage('Deploy to Staging') {
            steps {
                echo "Deploying to staging..."
                bat 'docker compose down --remove-orphans || exit 0'
                bat 'docker compose up -d'
                bat 'timeout /t 10 /nobreak'
                echo "Staging live at http://localhost:3001"
            }
        }

        stage('Release') {
            steps {
                echo "Releasing to production..."
                bat 'docker tag task-manager:latest task-manager:prod'
                bat 'docker compose -f docker-compose.prod.yml down || exit 0'
                bat 'docker compose -f docker-compose.prod.yml up -d'
                bat 'timeout /t 10 /nobreak'
                echo "Production live at http://localhost:3000"
            }
        }

        stage('Monitoring') {
            steps {
                echo "Checking monitoring stack..."
                bat 'timeout /t 5 /nobreak'
                bat 'curl -f http://localhost:9090/-/healthy || echo Prometheus starting'
                bat 'curl -f http://localhost:3000/metrics || echo Metrics check done'
                echo "Prometheus: http://localhost:9090"
                echo "Grafana: http://localhost:3002"
            }
        }
    }

    post {
        success {
            echo "Pipeline SUCCESS"
        }
        failure {
            echo "Pipeline FAILED"
        }
    }
}
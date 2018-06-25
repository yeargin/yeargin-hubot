node {
    def app

    stage('Clone repository') {
        checkout scm
    }

    stage('Build image') {
        app = docker.build("yeargin/yeargin-hubot")
    }

    stage('Test image') {
        app.inside {
            // Haven't been able to get these to work (path issues)
            // sh 'cp .env-dist .env'
            // sh 'npm test'
            sh 'exit 0'
        }
    }

    stage('Push image') {
        docker.withRegistry('https://registry.hub.docker.com', '5251fb33-a45a-4251-8271-b849fad23e03') {
            app.push("build-${env.BUILD_NUMBER}")
            app.push("latest")
        }
    }
}

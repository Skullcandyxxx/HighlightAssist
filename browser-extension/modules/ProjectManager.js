// ProjectManager: CRUD for projects
import { StorageService } from './StorageService.js';

export class ProjectManager {
  constructor(storage = new StorageService()) {
    this.storage = storage;
    this.projectsKey = 'ha_projects';
  }

  async getProjects() {
    return (await this.storage.get(this.projectsKey)) || [];
  }

  async addProject(project) {
    const projects = await this.getProjects();
    projects.push(project);
    await this.storage.set(this.projectsKey, projects);
  }

  async removeProject(index) {
    const projects = await this.getProjects();
    projects.splice(index, 1);
    await this.storage.set(this.projectsKey, projects);
  }

  async updateProject(index, newProject) {
    const projects = await this.getProjects();
    projects[index] = newProject;
    await this.storage.set(this.projectsKey, projects);
  }
}

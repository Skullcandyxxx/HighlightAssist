// ProjectForm: Manages add/edit project modal and validation

export class ProjectForm {
  constructor(projectManager, notification, uiRenderer = null) {
    this.projectManager = projectManager;
    this.notification = notification;
    this.uiRenderer = uiRenderer; // Optional custom UI renderer
  }

  validate({ name, cwd, command }) {
    if (!name) return { valid: false, error: 'Project name is required.' };
    if (!cwd) return { valid: false, error: 'Project folder is required.' };
    if (!command) return { valid: false, error: 'Command is required.' };
    return { valid: true };
  }

  async showAddForm() {
    let name, cwd, cmd;
    if (this.uiRenderer) {
      ({ name, cwd, cmd } = await this.uiRenderer());
    } else {
      name = prompt('Project name (e.g., Portal)');
      cwd = prompt('Project folder (absolute path)');
      cmd = prompt('Command to run (e.g., npm run dev)');
    }
    const { valid, error } = this.validate({ name, cwd, command: cmd });
    if (!valid) {
      this.notification.showError(error);
      return;
    }
    const confirmation = confirm(`Please confirm the project details:\n\nName: ${name}\nFolder: ${cwd}\nCommand: ${cmd}\n\nClick OK to save or Cancel to edit.`);
    if (!confirmation) {
      this.notification.showError('Project setup canceled. Please try again.');
      return;
    }
    try {
      await this.projectManager.addProject({ name, cwd, command: cmd });
      this.notification.showSuccess('Project saved successfully! You can now proceed to run the local host.');
    } catch (e) {
      this.notification.showError('Save failed: ' + e.message);
    }
  }
}

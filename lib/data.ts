export const projects = [
    { id: 1, name: "E-Commerce Website", progress: 75, status: "In Progress" },
    { id: 2, name: "Mobile App", progress: 40, status: "In Progress" },
    { id: 3, name: "API Development", progress: 90, status: "In Reviews" },
]

export const tasks = [
    { id: 1, title: "Design Home Page", project: "E-Commerce Website", status: "Completed", dueDate: "2023-10-20", assignee: "User" },
    { id: 2, title: "Develop API", project: "API Development", status: "In Progress", dueDate: "2023-10-25", assignee: "User" },
    { id: 3, title: "Fix Login Bug", project: "Mobile App", status: "Overdue", dueDate: "2023-10-18", assignee: "User" },
    { id: 4, title: "Create Database Schema", project: "E-Commerce Website", status: "Completed", dueDate: "2023-10-15", assignee: "John" },
    { id: 5, title: "Write Documentation", project: "API Development", status: "Todo", dueDate: "2023-10-30", assignee: "Sarah" },
    { id: 6, title: "Setup CI/CD", project: "Mobile App", status: "In Progress", dueDate: "2023-11-01", assignee: "Mike" },
    { id: 7, title: "Design User Profile", project: "Mobile App", status: "Todo", dueDate: "2023-11-05", assignee: "User" },
    { id: 8, title: "Optimize Images", project: "E-Commerce Website", status: "Todo", dueDate: "2023-11-10", assignee: "Jane" },
    { id: 9, title: "Implement Search", project: "E-Commerce Website", status: "In Progress", dueDate: "2023-11-12", assignee: "User" },
    { id: 10, title: "Test Payment Gateway", project: "E-Commerce Website", status: "Todo", dueDate: "2023-11-15", assignee: "John" },
]

export const teamMembers = [
    { id: 1, name: "Alice Johnson", role: "Product Owner", avatar: "/avatars/alice.jpg", tasks: 5 },
    { id: 2, name: "Bob Smith", role: "Frontend Dev", avatar: "/avatars/bob.jpg", tasks: 8 },
    { id: 3, name: "Charlie Brown", role: "Backend Dev", avatar: "/avatars/charlie.jpg", tasks: 6 },
    { id: 4, name: "Diana Prince", role: "Designer", avatar: "/avatars/diana.jpg", tasks: 4 },
    { id: 5, name: "Ethan Hunt", role: "QA Engineer", avatar: "/avatars/ethan.jpg", tasks: 7 },
]

export const recentActivities = [
    { id: 1, user: "Alice Johnson", action: "commented on", target: "Design Home Page", time: "2 hours ago" },
    { id: 2, user: "Bob Smith", action: "moved", target: "Fix Login Bug to In Progress", time: "4 hours ago" },
    { id: 3, user: "Charlie Brown", action: "completed", target: "Create Database Schema", time: "1 day ago" },
    { id: 4, user: "Diana Prince", action: "attached file to", target: "Design User Profile", time: "1 day ago" },
    { id: 5, user: "Ethan Hunt", action: "created", target: "Test Payment Gateway", time: "2 days ago" },
]

export const summaryStats = {
    totalProjects: 3,
    tasksInProgress: tasks.filter(t => t.status === "In Progress").length,
    completedTasks: tasks.filter(t => t.status === "Completed").length,
    overdueTasks: tasks.filter(t => t.status === "Overdue").length,
}

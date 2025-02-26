# Installation Instructions

[kubectl create -f crds.yaml](https://download.elastic.co/downloads/eck/2.2.0/crds.yaml)
[kubectl apply -f operator.yaml](https://download.elastic.co/downloads/eck/2.2.0/operator.yaml)


# TODO 
add health check on each django server

Error during registration: cannot import name 'user_register_self' from 'my_chat.authentications' (/chat/my_chat/authentications.py)
Traceback (most recent call last):
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 279, in ensure_connection
    self.connect()
    ~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 256, in connect
    self.connection = self.get_new_connection(conn_params)
                      ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/postgresql/base.py", line 332, in get_new_connection
    connection = self.Database.connect(**conn_params)
  File "/usr/local/lib/python3.14/site-packages/psycopg/connection.py", line 98, in connect
    attempts = conninfo_attempts(params)
  File "/usr/local/lib/python3.14/site-packages/psycopg/_conninfo_attempts.py", line 50, in conninfo_attempts
    raise e.OperationalError(str(last_exc))
psycopg.OperationalError: [Errno -2] Name or service not known

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/chat/manage.py", line 22, in <module>
    main()
    ~~~~^^
  File "/chat/manage.py", line 18, in main
    execute_from_command_line(sys.argv)
    ~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/core/management/__init__.py", line 442, in execute_from_command_line
    utility.execute()
    ~~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/core/management/__init__.py", line 436, in execute
    self.fetch_command(subcommand).run_from_argv(self.argv)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/core/management/base.py", line 413, in run_from_argv
    self.execute(*args, **cmd_options)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/core/management/base.py", line 459, in execute
    output = self.handle(*args, **options)
  File "/usr/local/lib/python3.14/site-packages/django/core/management/base.py", line 107, in wrapper
    res = handle_func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/core/management/commands/migrate.py", line 118, in handle
    executor = MigrationExecutor(connection, self.migration_progress_callback)
  File "/usr/local/lib/python3.14/site-packages/django/db/migrations/executor.py", line 18, in __init__
    self.loader = MigrationLoader(self.connection)
                  ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/db/migrations/loader.py", line 58, in __init__
    self.build_graph()
    ~~~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/db/migrations/loader.py", line 235, in build_graph
    self.applied_migrations = recorder.applied_migrations()
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/db/migrations/recorder.py", line 89, in applied_migrations
    if self.has_table():
       ~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/db/migrations/recorder.py", line 63, in has_table
    with self.connection.cursor() as cursor:
         ~~~~~~~~~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 320, in cursor
    return self._cursor()
           ~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 296, in _cursor
    self.ensure_connection()
    ~~~~~~~~~~~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 278, in ensure_connection
    with self.wrap_database_errors:
         ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/db/utils.py", line 91, in __exit__
    raise dj_exc_value.with_traceback(traceback) from exc_value
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 279, in ensure_connection
    self.connect()
    ~~~~~~~~~~~~^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/base/base.py", line 256, in connect
    self.connection = self.get_new_connection(conn_params)
                      ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/usr/local/lib/python3.14/site-packages/django/db/backends/postgresql/base.py", line 332, in get_new_connection
    connection = self.Database.connect(**conn_params)
  File "/usr/local/lib/python3.14/site-packages/psycopg/connection.py", line 98, in connect
    attempts = conninfo_attempts(params)
  File "/usr/local/lib/python3.14/site-packages/psycopg/_conninfo_attempts.py", line 50, in conninfo_attempts
    raise e.OperationalError(str(last_exc))
django.db.utils.OperationalError: [Errno -2] Name or service not known
Error during registration: cannot import name 'user_register_self' from 'my_chat.authentications' (/chat/my_chat/authentications.py)
INFO 2025-02-18 16:25:02,337 autoreload Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
February 18, 2025 - 16:25:02
Django version 5.1.3, using settings 'chat.settings'
Starting ASGI/Daphne version 4.1.2 development server at http://0.0.0.0:8000/
Quit the server with CONTROL-C.
ASGI APPLICATION LOADED
(venv) ➜  Manifests git:(k8s) ✗ 

Front end post support
Index db
Back end post support
going from RESTAPI to gRPC
Devops
Argocd and jenkins
